import { NextRequest, NextResponse } from "next/server";
import { uploadMedia } from "@/lib/github-service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided." }, { status: 400 });
    }

    const typedFiles: { name: string; blob: Blob; type: "image" | "video" }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type === "video/mp4" || file.name.endsWith(".mp4");

      if (!isImage && !isVideo) {
        return NextResponse.json(
          { success: false, error: `Unsupported file type: ${file.type || file.name}. Only images and MP4 videos are allowed.` },
          { status: 400 }
        );
      }

      typedFiles.push({
        name: file.name,
        blob: file,
        type: isVideo ? "video" : "image",
      });
    }

    const result = await uploadMedia(typedFiles);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      uploadedCount: result.items
        ? typedFiles.length - (result.skipped?.length || 0)
        : 0,
      skipped: result.skipped || [],
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json({ success: false, error: "Upload failed." }, { status: 500 });
  }
}
