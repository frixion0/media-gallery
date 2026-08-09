import { NextRequest, NextResponse } from "next/server";
import { downloadFromMega } from "@/lib/mega-service";
import { uploadFileToGitHub, updateGalleryData, getGitHubMediaFileNames } from "@/lib/github-service";

export async function POST(request: NextRequest) {
  try {
    const { nodeIds } = await request.json();

    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No file IDs provided." },
        { status: 400 }
      );
    }

    // Get existing GitHub files for duplicate check
    const existingFileNames = await getGitHubMediaFileNames();
    const existingNameSet = new Set(existingFileNames);

    const newItems = [];
    const imported = [];
    const skipped = [];

    for (const nodeId of nodeIds) {
      // Download from Mega
      const { buffer, fileName, error } = await downloadFromMega(nodeId);

      if (!buffer || error) {
        console.error(`Failed to download ${nodeId}:`, error);
        continue;
      }

      // Duplicate check
      if (existingNameSet.has(fileName)) {
        skipped.push(fileName);
        continue;
      }

      // Determine type
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"];
      const isImage = imageExts.includes(ext);
      const mediaType = isImage ? "image" : "video";

      // Upload to GitHub
      const base64 = buffer.toString("base64");
      const result = await uploadFileToGitHub(fileName, base64);

      if (result.success) {
        existingNameSet.add(fileName);
        imported.push(fileName);

        const rawUrl = `https://raw.githubusercontent.com/frixion0/media-gallery/main/media/${fileName}`;
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          src: rawUrl,
          type: mediaType,
          alt: fileName.replace(/\.[^/.]+$/, ""),
        });
      }
    }

    // Update gallery-data.json with all new items
    if (newItems.length > 0) {
      await updateGalleryData(newItems);
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      count: imported.length,
    });
  } catch (error) {
    console.error("POST /api/mega/import error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import from Mega." },
      { status: 500 }
    );
  }
}
