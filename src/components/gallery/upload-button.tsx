"use client";

import { useRef, useState, useCallback, Fragment } from "react";
import { Upload, Loader2, AlertCircle, CheckCircle, X, ImagePlus } from "lucide-react";

interface UploadButtonProps {
  onUploadComplete: () => void;
}

interface FileProgress {
  name: string;
  status: "pending" | "uploading" | "done" | "error" | "skipped";
}

export function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    uploadedCount: number;
    skipped: string[];
  } | null>(null);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);
      setError(null);
      setResult(null);

      const fileArray = Array.from(files);
      const progress: FileProgress[] = fileArray.map((f) => ({
        name: f.name,
        status: "pending" as const,
      }));
      setFileProgress(progress);

      let uploadedCount = 0;
      const skippedFiles: string[] = [];
      const currentSha = { value: "" };

      try {
        // Upload files one at a time so we can show per-file progress
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i];

          // Mark as uploading
          setFileProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, status: "uploading" } : p
            )
          );

          const formData = new FormData();
          formData.append("files", file);

          const response = await fetch("/api/gallery/upload", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();

          if (data.success) {
            setFileProgress((prev) =>
              prev.map((p, idx) =>
                idx === i ? { ...p, status: "done" } : p
              )
            );
            if (data.uploadedCount > 0) {
              uploadedCount += data.uploadedCount;
            }
            if (data.skipped?.length > 0) {
              skippedFiles.push(...data.skipped);
              setFileProgress((prev) =>
                prev.map((p, idx) =>
                  idx === i ? { ...p, status: "skipped" } : p
                )
              );
            }
          } else {
            setFileProgress((prev) =>
              prev.map((p, idx) =>
                idx === i ? { ...p, status: "error" } : p
              )
            );
            setError(data.error || `Failed to upload ${file.name}`);
            // Continue with remaining files even if one fails
          }
        }

        setResult({
          uploadedCount,
          skipped: skippedFiles,
        });

        if (uploadedCount > 0) {
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
      setFileProgress([]);
    }
  };

  const openModal = () => {
    setIsOpen(true);
    setResult(null);
    setError(null);
    setFileProgress([]);
  };

  const doneCount = fileProgress.filter(
    (f) => f.status === "done" || f.status === "skipped"
  ).length;
  const totalCount = fileProgress.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

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
            {/* Header */}
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

            {/* Content */}
            <div className="p-5 flex-1">
              {/* Initial state: file picker */}
              {!isUploading && !result && !error && fileProgress.length === 0 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 hover:border-gray-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors active:bg-gray-800/50"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <ImagePlus className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-300 mb-1">Click to select files</p>
                  <p className="text-xs text-gray-500">Images and MP4 videos — Multiple files allowed</p>
                </div>
              )}

              {/* Uploading state with per-file progress */}
              {isUploading && (
                <div className="flex flex-col items-center py-2">
                  {/* Overall progress bar */}
                  <div className="w-full mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        Uploading to GitHub
                      </span>
                      <span className="text-sm text-gray-400">
                        {doneCount}/{totalCount}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* File list */}
                  <div className="w-full space-y-2 max-h-48 overflow-y-auto">
                    {fileProgress.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/60"
                      >
                        {file.status === "pending" && (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-600 shrink-0" />
                        )}
                        {file.status === "uploading" && (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                        )}
                        {file.status === "done" && (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {file.status === "skipped" && (
                          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                        )}
                        {file.status === "error" && (
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className={`text-xs truncate flex-1 ${
                          file.status === "done"
                            ? "text-gray-400"
                            : file.status === "error"
                            ? "text-red-400"
                            : file.status === "skipped"
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-gray-600 shrink-0">
                          {file.status === "uploading" && "Uploading..."}
                          {file.status === "done" && "Done"}
                          {file.status === "skipped" && "Duplicate"}
                          {file.status === "error" && "Failed"}
                          {file.status === "pending" && "Waiting"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && !isUploading && (
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

              {/* Result state */}
              {result && !isUploading && (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-950/50 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-emerald-300 mb-3">
                    Upload Complete
                  </p>
                  <div className="w-full space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{result.uploadedCount} file(s) uploaded to GitHub</span>
                    </div>
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

            {/* Footer */}
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
