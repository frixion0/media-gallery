import { NextResponse } from "next/server";
import { getGalleryData, getGitHubMediaTotalSize } from "@/lib/github-service";

const SAMPLE_MEDIA = [
  { id: "sample-1", src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", type: "image" as const, alt: "Mountain landscape" },
  { id: "sample-2", src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80", type: "image" as const, alt: "Foggy forest" },
  { id: "sample-3", src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", type: "image" as const, alt: "Sunlit forest path" },
  { id: "sample-4", src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", type: "image" as const, alt: "Tropical beach" },
  { id: "sample-5", src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", type: "image" as const, alt: "Starry mountain night" },
  { id: "sample-6", src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80", type: "image" as const, alt: "Waterfall in nature" },
  { id: "sample-7", src: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80", type: "image" as const, alt: "Green rolling hills" },
  { id: "sample-8", src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80", type: "image" as const, alt: "Misty mountain valley" },
];

export async function GET() {
  try {
    const galleryData = await getGalleryData();

    if (galleryData) {
      // Sort: favourites first, then original order
      const sorted = [...galleryData.items].sort((a, b) => {
        if (a.favourite && !b.favourite) return -1;
        if (!a.favourite && b.favourite) return 1;
        return 0;
      });

      // Get total size in parallel
      const totalSize = await getGitHubMediaTotalSize();

      return NextResponse.json({
        items: sorted,
        source: "github",
        totalSizeBytes: totalSize,
      });
    }

    return NextResponse.json({ items: SAMPLE_MEDIA, source: "sample", totalSizeBytes: 0 });
  } catch (error) {
    console.error("GET /api/gallery error:", error);
    return NextResponse.json({ items: SAMPLE_MEDIA, source: "sample", totalSizeBytes: 0 }, { status: 200 });
  }
}
