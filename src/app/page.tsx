"use client";

import { useEffect, useState, useCallback } from "react";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { UploadButton } from "@/components/gallery/upload-button";
import { ImportFromMega } from "@/components/gallery/import-from-mega";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import type { MediaItem } from "@/lib/github-service";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Database } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GalleryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dataSource, setDataSource] = useState("");
  const [totalSize, setTotalSize] = useState(0);

  const fetchGallery = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/gallery");
      const data = await res.json();
      setItems(data.items || []);
      setDataSource(data.source || "unknown");
      setTotalSize(data.totalSizeBytes || 0);
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const handleOpen = (index: number) => { setCurrentIndex(index); setLightboxOpen(true); };
  const handleClose = () => { setLightboxOpen(false); };

  const handleDelete = useCallback(async (itemIds: string[]) => {
    try {
      const res = await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });
      const data = await res.json();
      if (data.success) { fetchGallery(); } else { alert(data.error || "Delete failed."); }
    } catch { alert("Network error during delete."); }
  }, [fetchGallery]);

  const handleFavourite = useCallback(async (itemId: string) => {
    try {
      const res = await fetch("/api/gallery/favourite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic update
        setItems((prev) => {
          const updated = prev.map((item) =>
            item.id === itemId ? { ...item, favourite: !item.favourite } : item
          );
          return [...updated].sort((a, b) => {
            if (a.favourite && !b.favourite) return -1;
            if (!a.favourite && b.favourite) return 1;
            return 0;
          });
        });
      }
    } catch { /* silent */ }
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gray-900 text-white flex flex-col">
      <header className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-0 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-xl font-bold tracking-tight leading-tight truncate">
                  Media Gallery
                </h1>
                <p className="text-sm text-gray-400 leading-tight hidden sm:block">
                  {isLoading ? "Loading..." : `${items.length} item${items.length !== 1 ? "s" : ""}`}
                  {!isLoading && totalSize > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 text-gray-500">
                      <Database className="w-3 h-3" />
                      {formatSize(totalSize)}
                    </span>
                  )}
                  {dataSource === "sample" && !isLoading && (
                    <span className="ml-2 text-amber-400/80 text-xs">demo mode</span>
                  )}
                  {dataSource === "github" && !isLoading && (
                    <span className="ml-2 text-emerald-400/60 text-xs">GitHub + Mega sync</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ImportFromMega onImportComplete={fetchGallery} />
              <UploadButton onUploadComplete={fetchGallery} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg sm:rounded-xl bg-gray-800" />
            ))}
          </div>
        ) : (
          <GalleryGrid items={items} onOpen={handleOpen} onDelete={handleDelete} onFavourite={handleFavourite} />
        )}
      </main>

      <footer className="hidden sm:block mt-auto border-t border-white/5 py-4 text-center text-xs text-gray-600">
        Media Gallery — GitHub + Mega.nz Dual Storage
      </footer>

      {items.length > 0 && (
        <GalleryLightbox items={items} open={lightboxOpen} currentIndex={currentIndex} onClose={handleClose} />
      )}
    </div>
  );
}
