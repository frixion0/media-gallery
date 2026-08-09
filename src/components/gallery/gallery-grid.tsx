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
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.5) }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="relative group cursor-pointer overflow-hidden rounded-lg sm:rounded-xl bg-gray-800 aspect-square"
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
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white ml-0.5 sm:ml-1" fill="white" />
                </div>
              </div>
            </div>
          )}

          {/* VIDEO badge */}
          {item.type === "video" && (
            <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white rounded sm:rounded-md shadow-lg">
              Video
            </span>
          )}

          {/* Favourite heart - top left */}
          <button
            onClick={(e) => handleFavourite(e, item)}
            className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all"
            aria-label={item.favourite ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-200 ${
                item.favourite
                  ? "text-red-500 fill-red-500 drop-shadow-lg"
                  : "text-white/70 hover:text-white"
              }`}
            />
          </button>

          {/* Action buttons - top right, hover on desktop, always on mobile */}
          <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 sm:transition-opacity duration-200 z-10">
            <button onClick={(e) => handleDownload(e, item)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors border border-white/10" aria-label="Download">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button onClick={(e) => handleDelete(e, item)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-colors border border-white/10" aria-label="Delete">
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Mobile bottom actions */}
          <div className="sm:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="sm:hidden absolute bottom-0 left-0 right-0 p-2 flex justify-end gap-1.5 pointer-events-auto">
            <button onClick={(e) => handleDownload(e, item)} className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 active:bg-black/80" aria-label="Download">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => handleDelete(e, item)} className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-red-400 active:bg-red-600 active:text-white" aria-label="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hover overlay (desktop) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <p className="text-white text-xs sm:text-sm font-medium truncate">{item.alt}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
