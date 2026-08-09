"use client";

import { useRef, useState, useCallback, Fragment } from "react";
import { Upload, Loader2, AlertCircle, CheckCircle, Cloud, X, ImagePlus } from "lucide-react";

interface UploadButtonProps {
  onUploadComplete: () => void;
}

export function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const close = () => {
    if (!isUploading) {
      setIsOpen(false);
      setResult(null);
      setError(null);
    }
  };

  const openModal = () => {
    setIsOpen(true);
    setResult(null);
    setError(null);
  };

  return (
    <Fragment>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={openModal}
        className="sm:hidden p-2.5 rounded-xl bg-white text-gray-900 active:scale-90 transition-all"
        aria-label="Upload media"
      >
        <ImagePlus className="w-5 h-5" />
      </button>

      <button
        onClick={openModal}
        className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-white/5 bg-white text-gray-900 hover:bg-gray-100 active:scale-95"
      >
        <Upload className="w-4 h-4" />
        Upload Media
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />
          <div
            className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ animation: "modalIn 0.2s ease-out" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white to-gray-300 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-gray-900" />
                </div>
                <h2 className="text-lg font-semibold">Upload Media</h2>
              </div>
              <button
                onClick={close}
                disabled={isUploading}
                className="p-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1">
              {!isUploading && !result && !error && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 hover:border-gray-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors active:bg-gray-800/50"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <ImagePlus className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-300 mb-1">Click to select files</p>
                  <p className="text-xs text-gray-500">Images and MP4 videos - Multiple files allowed</p>
                </div>
              )}

              {isUploading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-10 h-10 animate-spin text-white mb-4" />
                  <p className="text-sm font-medium">Uploading to GitHub...</p>
                  <p className="text-xs text-gray-500 mt-1">Files will also be backed up to Mega</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-12 h-12 rounded-full bg-red-950/50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-sm text-red-300 text-center mb-4">{error}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {result && (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-950/50 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-emerald-300 mb-3">Upload Complete</p>
                  <div className="w-full space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{result.uploadedCount} file(s) uploaded to GitHub</span>
                    </div>
                    {result.mega.uploaded > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>{result.mega.uploaded} backed up to Mega</span>
                      </div>
                    )}
                    {result.skipped.length > 0 && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                        <span>{result.skipped.length} duplicate(s) skipped</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors"
                  >
                    Upload More
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-800 flex justify-end">
              <button
                onClick={close}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
