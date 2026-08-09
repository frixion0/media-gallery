"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { MediaItem } from "@/lib/github-service";

interface GalleryGridProps {
  items: MediaItem[];
  onOpen: (index: number) => void;
}

export function GalleryGrid({ items, onOpen }: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-gray-500 px-4">
        <svg
          className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
          />
        </svg>
        <p className="text-base sm:text-lg font-medium">No media yet</p>
        <p className="text-sm mt-1 text-center">Upload images or videos to get started</p>
      </div>
    );
  }

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
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(index);
            }
          }}
        >
          {item.type === "image" ? (
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="relative w-full h-full">
              <video
                src={item.src}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                preload="metadata"
                playsInline
              />
              {/* Play icon overlay for videos */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm border border-white/20 transition-transform duration-300 group-hover:scale-110">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white ml-0.5 sm:ml-1" fill="white" />
                </div>
              </div>
            </div>
          )}

          {/* VIDEO badge - smaller on mobile */}
          {item.type === "video" && (
            <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white rounded sm:rounded-md shadow-lg">
              Video
            </span>
          )}

          {/* Hover overlay - always visible on touch, hover on desktop */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <p className="text-white text-xs sm:text-sm font-medium truncate">
              {item.alt}
            </p>
          </div>

          {/* Mobile tap hint ripple effect */}
          <div className="absolute inset-0 sm:hidden pointer-events-none">
            <div className="absolute inset-0 border-2 border-white/0 group-active:border-white/30 rounded-lg sm:rounded-xl transition-colors duration-150" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
