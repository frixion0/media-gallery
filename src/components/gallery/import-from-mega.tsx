"use client";

import { useState, useCallback, useEffect } from "react";
import { Cloud, Download, RefreshCw, Loader2, Check, AlertCircle, X, HardDrive } from "lucide-react";

interface MegaFile {
  name: string;
  size: number;
  type: "image" | "video";
  nodeId: string;
  path: string;
  alreadyInGitHub: boolean;
}

interface ImportFromMegaProps {
  onImportComplete: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportFromMega({ onImportComplete }: ImportFromMegaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<MegaFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: string[]; skipped: string[] } | null>(null);

  const fetchMegaFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mega/list");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setFiles([]);
      } else {
        setFiles(data.files || []);
      }
    } catch {
      setError("Failed to connect to Mega.");
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMegaFiles();
      setSelected(new Set());
      setImportResult(null);
    }
  }, [isOpen, fetchMegaFiles]);

  const toggleFile = (nodeId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    setImportResult(null);
  };

  const selectAllNonDuplicate = () => {
    const nonDupes = files.filter((f) => !f.alreadyInGitHub);
    setSelected(new Set(nonDupes.map((f) => f.nodeId)));
    setImportResult(null);
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/mega/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeIds: Array.from(selected) }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Import failed.");
      } else {
        setImportResult({ imported: data.imported || [], skipped: data.skipped || [] });
        if (data.imported?.length > 0) {
          onImportComplete();
        }
      }
    } catch {
      setError("Network error during import.");
    } finally {
      setIsImporting(false);
    }
  };

  const selectableFiles = files.filter((f) => !f.alreadyInGitHub);
  const allSelected = selectableFiles.length > 0 && selected.size === selectableFiles.length;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-white/5 bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700 hover:border-gray-600"
      >
        <HardDrive className="w-4 h-4" />
        Import from Mega
      </button>

      {/* Slide-over panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">Import from Mega</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Error message */}
              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Import result */}
              {importResult && (
                <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium mb-1">
                    <Check className="w-4 h-4" />
                    Import complete
                  </div>
                  {importResult.imported.length > 0 && (
                    <p className="text-emerald-400/80 text-xs">
                      {importResult.imported.length} file(s) imported to GitHub
                    </p>
                  )}
                  {importResult.skipped.length > 0 && (
                    <p className="text-yellow-400/80 text-xs mt-1">
                      {importResult.skipped.length} duplicate(s) skipped
                    </p>
                  )}
                </div>
              )}

              {/* Loading state */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">Connecting to Mega...</p>
                </div>
              ) : files.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Cloud className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No media files found</p>
                  <p className="text-xs mt-1">Scans all folders in your Mega cloud</p>
                </div>
              ) : (
                <>
                  {/* Select all button */}
                  {selectableFiles.length > 0 && (
                    <button
                      onClick={selectAllNonDuplicate}
                      className="mb-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {allSelected ? "Deselect all" : `Select all new (${selectableFiles.length})`}
                    </button>
                  )}

                  {/* File list */}
                  <div className="space-y-2">
                    {files.map((file) => {
                      const isDuplicate = file.alreadyInGitHub;
                      const isSelected = selected.has(file.nodeId);

                      return (
                        <div
                          key={file.nodeId}
                          onClick={() => !isDuplicate && toggleFile(file.nodeId)}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
                            ${
                              isDuplicate
                                ? "border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed"
                                : isSelected
                                  ? "border-emerald-600 bg-emerald-950/30"
                                  : "border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/50"
                            }
                          `}
                        >
                          {/* Checkbox */}
                          <div
                            className={`
                              w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all
                              ${
                                isSelected
                                  ? "bg-emerald-500 border-emerald-500"
                                  : isDuplicate
                                    ? "border-gray-700 bg-gray-800"
                                    : "border-gray-600"
                              }
                            `}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500 truncate max-w-[180px]" title={file.path}>
                                {file.path}
                              </span>
                              <span className="text-[10px] text-gray-600">{formatFileSize(file.size)}</span>
                              <span
                                className={`
                                  text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                                  ${
                                    file.type === "video"
                                      ? "bg-red-900/50 text-red-400"
                                      : "bg-gray-800 text-gray-400"
                                  }
                                `}
                              >
                                {file.type}
                              </span>
                              {isDuplicate && (
                                <span className="text-[10px] font-medium text-yellow-500">
                                  Already in GitHub
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-800 flex items-center gap-3">
              <button
                onClick={fetchMegaFiles}
                disabled={isLoading || isImporting}
                className="p-2.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200 disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || isImporting}
                className={`
                  flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                  ${
                    selected.size === 0 || isImporting
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98]"
                  }
                `}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Import {selected.size > 0 ? `(${selected.size})` : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}