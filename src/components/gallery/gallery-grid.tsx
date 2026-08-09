"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Download, Trash2, Heart } from "lucide-react";
import type { MediaItem } from "@/lib/github-service";

interface GalleryGridProps {
  items: MediaItem[];
  onOpen: (index: number) => void;
  onDelete: (itemIds: string[]) => void;
  onFavourite: (itemId: string) => void;
}

export function GalleryGrid({ items, onOpen, onDelete, onFavourite }: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-gray-500 px-4">
        <svg className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
        <p className="text-base sm:text-lg font-medium">No media yet</p>
        <p className="text-sm mt-1 text-center">Upload images or videos to get started</p>
      </div>
    );
  }

  const handleDownload = (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = item.src;
    link.download = item.alt;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (confirm(`Delete "${item.alt}" from gallery?\n(Mega backup will be kept)`)) {
      onDelete([item.id]);
    }
  };

  const handleFavourite = (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    onFavourite(item.id);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.5) }}
          whileTap={{ scale: 0.97 }}
          className="relative group cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl bg-gray-800 aspect-square"
          onClick={() => onOpen(index)}
          role="button"
          tabIndex={0}
          aria-label={`View ${item.alt}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(index); }
          }}
        >
          {item.type === "image" ? (
            <Image src={item.src} alt={item.alt} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
          ) : (
            <div className="relative w-full h-full">
              <video src={item.src} className="absolute inset-0 w-full h-full object-cover" muted preload="metadata" playsInline />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5" fill="white" />
                </div>
              </div>
            </div>
          )}

          {/* Dark gradient at bottom for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* VIDEO badge - top left */}
          {item.type === "video" && (
            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-red-600 text-white rounded-md shadow-lg">
              Video
            </span>
          )}

          {/* Favourite heart - bottom left, above the name */}
          <button
            onClick={(e) => handleFavourite(e, item)}
            className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all border border-white/10"
            aria-label={item.favourite ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-200 ${
                item.favourite
                  ? "text-red-500 fill-red-500 drop-shadow-lg"
                  : "text-white/70 hover:text-white"
              }`}
            />
          </button>

          {/* Action buttons - top right, hover on desktop, always on mobile */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1.5 sm:gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 sm:transition-opacity duration-200 z-10">
            <button onClick={(e) => handleDownload(e, item)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 active:bg-black/80 transition-colors border border-white/10" aria-label="Download">
              <Download className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
            <button onClick={(e) => handleDelete(e, item)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white active:bg-red-600 active:text-white transition-colors border border-white/10" aria-label="Delete">
              <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Name label - bottom right area */}
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 left-10 sm:left-12 pointer-events-none">
            <p className="text-white text-[11px] sm:text-sm font-medium truncate drop-shadow-lg">{item.alt}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
