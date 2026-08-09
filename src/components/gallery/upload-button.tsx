"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Loader2, AlertCircle, CheckCircle, Cloud, X } from "lucide-react";

interface UploadButtonProps {
  onUploadComplete: () => void;
}

export function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    uploadedCount: number;
    skipped: string[];
    mega: { uploaded: number; failed: number };
  } | null>(null);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append("files", file);
        });

        const response = await fetch("/api/gallery/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Upload failed.");
          return;
        }

        setResult({
          uploadedCount: data.uploadedCount || 0,
          skipped: data.skipped || [],
          mega: data.mega || { uploaded: 0, failed: 0 },
        });

        if (data.uploadedCount > 0) {
          onUploadComplete();
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError("Network error. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
      setResult(null);
      setError(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const dismissResult = () => {
    setResult(null);
    setError(null);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4"
        multiple
        className="hidden"
        onChange={handleChange}
        aria-label="Upload media files"
      />

      {/* Mobile: Icon-only button */}
      <button
        onClick={handleClick}
        disabled={isUploading}
        className={
          `sm:hidden relative p-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-white/5 ${
          isUploading
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-900 active:scale-90"
        }`
        }
        aria-label="Upload media"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Upload className="w-5 h-5" />
        )}
        {/* Uploading progress ring */}
        {isUploading && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Desktop: Full button with text */}
      <button
        onClick={handleClick}
        disabled={isUploading}
        className={
          `hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-white/5 ${
          isUploading
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-900 hover:bg-gray-100 active:scale-95"
        }`
        }
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload Media
          </>
        )}
      </button>

      {/* Upload result notification - mobile toast style */}
      {(result || error) && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-w-xs sm:relative z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-2">
            {result && (
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{result.uploadedCount} file(s) uploaded to GitHub</span>
                  </div>
                  <button
                    onClick={dismissResult}
                    className="p-0.5 rounded hover:bg-gray-700 text-gray-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {result.mega.uploaded > 0 && (
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <Cloud className="w-3.5 h-3.5 shrink-0" />
                    <span>{result.mega.uploaded} file(s) backed up to Mega</span>
                  </div>
                )}
                {result.skipped.length > 0 && (
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{result.skipped.length} duplicate(s) skipped</span>
                  </div>
                )}
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  onClick={dismissResult}
                  className="p-0.5 rounded hover:bg-gray-700 text-gray-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
