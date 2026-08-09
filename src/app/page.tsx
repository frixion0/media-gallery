"use client";

import { useEffect, useState, useCallback } from "react";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { UploadButton } from "@/components/gallery/upload-button";
import { ImportFromMega } from "@/components/gallery/import-from-mega";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import type { MediaItem } from "@/lib/github-service";
import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dataSource, setDataSource] = useState<string>("");

  const fetchGallery = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/gallery");
      const data = await res.json();
      setItems(data.items || []);
      setDataSource(data.source || "unknown");
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleOpen = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const handleClose = () => {
    setLightboxOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Media Gallery
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {isLoading
                ? "Loading..."
                : `${items.length} item${items.length !== 1 ? "s" : ""}`}
              {dataSource === "sample" && !isLoading && (
                <span className="ml-2 text-amber-400/80 text-xs">
                  (demo mode)
                </span>
              )}
              {dataSource === "github" && !isLoading && (
                <span className="ml-2 text-emerald-400/60 text-xs">
                  GitHub + Mega sync active
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ImportFromMega onImportComplete={fetchGallery} />
            <UploadButton onUploadComplete={fetchGallery} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-square rounded-xl bg-gray-800"
              />
            ))}
          </div>
        ) : (
          <GalleryGrid items={items} onOpen={handleOpen} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 py-4 text-center text-xs text-gray-600">
        Media Gallery — GitHub + Mega.nz Dual Storage
      </footer>

      {/* Lightbox */}
      {items.length > 0 && (
        <GalleryLightbox
          items={items}
          open={lightboxOpen}
          currentIndex={currentIndex}
          onClose={handleClose}
        />
      )}
    </div>
  );
}