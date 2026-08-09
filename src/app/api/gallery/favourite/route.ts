import { NextRequest, NextResponse } from "next/server";
import { toggleFavourite } from "@/lib/github-service";

export async function POST(request: NextRequest) {
  try {
    const { itemId } = await request.json();
    if (!itemId) {
      return NextResponse.json({ success: false, error: "No item ID." }, { status: 400 });
    }
    const result = await toggleFavourite(itemId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/gallery/favourite error:", error);
    return NextResponse.json({ success: false, error: "Failed to toggle favourite." }, { status: 500 });
  }
}
