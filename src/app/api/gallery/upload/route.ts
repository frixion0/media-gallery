import { NextRequest, NextResponse } from "next/server";
import { uploadMedia } from "@/lib/github-service";
import { uploadToMega } from "@/lib/mega-service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided." },
        { status: 400 }
      );
    }

    // Validate and prepare files
    const preparedFiles: {
      name: string;
      blob: Blob;
      type: "image" | "video";
      buffer?: Buffer;
    }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type === "video/mp4";

      if (!isImage && !isVideo) {
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" is not supported. Only images and MP4 videos are accepted.`,
          },
          { status: 400 }
        );
      }

      // Convert to buffer for Mega upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      preparedFiles.push({
        name: file.name,
        blob: file,
        type: isVideo ? "video" : "image",
        buffer,
      });
    }

    // 1. Upload to GitHub (with duplicate check)
    const ghResult = await uploadMedia(
      preparedFiles.map((f) => ({ name: f.name, blob: f.blob, type: f.type }))
    );

    if (!ghResult.success) {
      return NextResponse.json(
        { success: false, error: ghResult.error },
        { status: 500 }
      );
    }

    // 2. Upload to Mega in parallel (non-blocking, best-effort)
    const megaResults = await Promise.allSettled(
      preparedFiles
        .filter((f) => !ghResult.skipped?.includes(f.name))
        .map(async (f) => {
          if (!f.buffer) return { name: f.name, success: false };
          return { name: f.name, ...(await uploadToMega(f.buffer, f.name)) };
        })
    );

    const megaSuccesses = megaResults.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const megaFailures = megaResults.filter(
      (r) => r.status === "fulfilled" && !r.value.success
    ).length;

    return NextResponse.json({
      success: true,
      items: ghResult.items,
      uploadedCount: preparedFiles.length - (ghResult.skipped?.length || 0),
      skipped: ghResult.skipped || [],
      mega: {
        uploaded: megaSuccesses,
        failed: megaFailures,
      },
    });
  } catch (error) {
    console.error("POST /api/gallery/upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during upload." },
      { status: 500 }
    );
  }
}