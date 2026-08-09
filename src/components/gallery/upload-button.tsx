"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Loader2, AlertCircle, CheckCircle, Cloud } from "lucide-react";

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

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4"
        multiple
        className="hidden"
        onChange={handleChange}
        aria-label="Upload media files"
      />

      <button
        onClick={handleClick}
        disabled={isUploading}
        className={`
          inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-white/5 ${
          isUploading
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-900 hover:bg-gray-100 active:scale-95"
        }`}
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

      {/* Upload result notification */}
      {result && (
        <div className="flex flex-col gap-1.5 text-xs max-w-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{result.uploadedCount} file(s) uploaded to GitHub</span>
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
        <div className="flex items-center gap-2 text-red-400 text-xs max-w-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}