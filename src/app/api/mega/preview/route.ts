import { NextRequest, NextResponse } from "next/server";
import { downloadFromMega } from "@/lib/mega-service";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const { nodeId } = await request.json();
    if (!nodeId) {
      return NextResponse.json({ error: "No nodeId" }, { status: 400 });
    }

    const { buffer, error } = await downloadFromMega(nodeId);
    if (!buffer || error) {
      return NextResponse.json({ error: error || "Download failed" }, { status: 500 });
    }

    // Generate a small thumbnail (120px wide, maintain aspect ratio)
    const thumbnail = await sharp(buffer)
      .resize(120, null, { withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer();

    const base64 = thumbnail.toString("base64");
    return NextResponse.json({ preview: `data:image/jpeg;base64,${base64}` });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
