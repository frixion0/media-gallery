import { NextRequest, NextResponse } from "next/server";
import { uploadMedia, fileToBase64 } from "@/lib/github-service";

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

      preparedFiles.push({
        name: file.name,
        blob: file,
        type: isVideo ? "video" : "image",
      });
    }

    const result = await uploadMedia(preparedFiles);

    if (result.success) {
      return NextResponse.json({
        success: true,
        items: result.items,
        uploadedCount: preparedFiles.length,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/gallery/upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during upload." },
      { status: 500 }
    );
  }
}
