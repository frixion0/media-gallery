import { NextRequest, NextResponse } from "next/server";
import { deleteMediaFromGitHub } from "@/lib/github-service";

export async function POST(request: NextRequest) {
  try {
    const { itemIds } = await request.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No item IDs provided." },
        { status: 400 }
      );
    }

    const result = await deleteMediaFromGitHub(itemIds);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      count: result.deleted.length,
    });
  } catch (error) {
    console.error("POST /api/gallery/delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete media." },
      { status: 500 }
    );
  }
}
