"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";

import "@/styles/yarl-lightbox.css";

import type { MediaItem } from "@/lib/github-service";

interface GalleryLightboxProps {
  items: MediaItem[];
  open: boolean;
  currentIndex: number;
  onClose: () => void;
}

export function GalleryLightbox({
  items,
  open,
  currentIndex,
  onClose,
}: GalleryLightboxProps) {
  const slides = items.map((item) => {
    if (item.type === "video") {
      return {
        type: "video" as const,
        sources: [
          {
            src: item.src,
            type: "video/mp4",
          },
        ],
      };
    }
    return {
      src: item.src,
      alt: item.alt,
      width: 1920,
      height: 1080,
    };
  });

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={currentIndex}
      slides={slides}
      plugins={[Zoom, Video]}
      zoom={{ maxZoomPixelRatio: 5, scrollToZoom: true }}
      video={{ controls: true, autoPlay: true, muted: false, loop: true }}
      styles={{
        container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
      }}
    />
  );
}
