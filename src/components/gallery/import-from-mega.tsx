"use client";

import { useState, useCallback, useEffect, Fragment } from "react";
import { Cloud, Download, RefreshCw, Loader2, Check, AlertCircle, X, HardDrive, Image as ImageIcon, Film } from "lucide-react";

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSizeShort(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
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
  const [totalSize, setTotalSize] = useState(0);
  const [alreadyTransferred, setAlreadyTransferred] = useState(0);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [loadingPreview, setLoadingPreview] = useState<Set<string>>(new Set());

  const fetchMegaFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setImportResult(null);
    setPreviews(new Map());
    try {
      const res = await fetch("/api/mega/list");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setFiles([]);
      } else {
        setFiles(data.files || []);
        setTotalSize(data.totalSizeBytes || 0);
        setAlreadyTransferred(data.alreadyTransferred || 0);
      }
    } catch {
      setError("Network error. Check your connection.");
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load previews for visible image files
  const loadPreview = useCallback(async (nodeId: string) => {
    if (previews.has(nodeId) || loadingPreview.has(nodeId)) return;
    setLoadingPreview((prev) => new Set(prev).add(nodeId));
    try {
      const res = await fetch("/api/mega/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId }),
      });
      const data = await res.json();
      if (data.preview) {
        setPreviews((prev) => new Map(prev).set(nodeId, data.preview));
      }
    } catch {
      // Preview failed, show placeholder
    } finally {
      setLoadingPreview((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, [previews, loadingPreview]);

  useEffect(() => {
    if (isOpen) {
      fetchMegaFiles();
      setSelected(new Set());
    }
  }, [isOpen, fetchMegaFiles]);

  // Load previews for image files when list loads
  useEffect(() => {
    if (files.length > 0 && !isLoading) {
      const imageFiles = files.filter((f) => f.type === "image").slice(0, 20);
      imageFiles.forEach((f, i) => {
        setTimeout(() => loadPreview(f.nodeId), i * 300);
      });
    }
  }, [files, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFile = (nodeId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    setImportResult(null);
  };

  const selectAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((f) => f.nodeId)));
    }
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
        setSelected(new Set());
        if (data.imported?.length > 0) onImportComplete();
      }
    } catch {
      setError("Network error during import.");
    } finally {
      setIsImporting(false);
    }
  };

  const close = () => { if (!isLoading && !isImporting) setIsOpen(false); };
  const allSelected = files.length > 0 && selected.size === files.length;
  const selectedSize = files.filter((f) => selected.has(f.nodeId)).reduce((s, f) => s + f.size, 0);

  const trigger = (
    <Fragment>
      <button onClick={() => setIsOpen(true)} className="sm:hidden p-2.5 rounded-xl bg-gray-800 text-gray-200 border border-gray-700 active:scale-90 transition-all" aria-label="Import from Mega">
        <HardDrive className="w-5 h-5" />
      </button>
      <button onClick={() => setIsOpen(true)} className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-white/5 bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700 hover:border-gray-600">
        <HardDrive className="w-4 h-4" />
        Import from Mega
      </button>
    </Fragment>
  );

  if (!isOpen) return trigger;

  return (
    <Fragment>
      {trigger}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
        <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85dvh]" style={{ animation: "modalIn 0.2s ease-out" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold leading-tight">Import from Mega</h2>
                {files.length > 0 && !isLoading && (
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {files.length} new file{files.length !== 1 ? "s" : ""} &middot; {formatSize(totalSize)} total
                    {alreadyTransferred > 0 && <span className="text-emerald-500"> &middot; {alreadyTransferred} already synced</span>}
                  </p>
                )}
              </div>
            </div>
            <button onClick={close} disabled={isLoading || isImporting} className="p-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            {error && (
              <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-red-950/50 border border-red-800/50 rounded-xl text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Connection Error</p>
                  <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {importResult && (
              <div className="mb-4 p-3.5 bg-emerald-950/50 border border-emerald-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium mb-1.5">
                  <Check className="w-4 h-4" /> Import complete
                </div>
                {importResult.imported.length > 0 && <p className="text-emerald-400/80 text-xs">{importResult.imported.length} file(s) imported</p>}
                {importResult.skipped.length > 0 && <p className="text-yellow-400/80 text-xs mt-1">{importResult.skipped.length} duplicate(s) skipped</p>}
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">Connecting to Mega...</p>
              </div>
            ) : files.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                <Check className="w-11 h-11 mb-3 text-emerald-500 opacity-50" />
                <p className="text-sm font-medium">All synced!</p>
                <p className="text-xs mt-1">No new files to import</p>
              </div>
            ) : (
              <Fragment>
                {/* Select bar */}
                <div className="flex items-center justify-between mb-3">
                  <button onClick={selectAll} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors py-1">
                    {allSelected ? "Deselect all" : `Select all (${files.length})`}
                  </button>
                  {selected.size > 0 && (
                    <span className="text-xs text-gray-500">
                      {selected.size} selected &middot; {formatSizeShort(selectedSize)}
                    </span>
                  )}
                </div>

                {/* File list with previews */}
                <div className="space-y-1.5">
                  {files.map((file) => {
                    const isSelected = selected.has(file.nodeId);
                    const preview = previews.get(file.nodeId);
                    const isLoadingPv = loadingPreview.has(file.nodeId);

                    return (
                      <div
                        key={file.nodeId}
                        onClick={() => toggleFile(file.nodeId)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors duration-100 cursor-pointer active:scale-[0.99] ${isSelected ? "border-emerald-600 bg-emerald-950/30" : "border-gray-800 bg-gray-900/50 hover:border-gray-600"}`}
                      >
                        {/* Thumbnail / preview */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center">
                          {preview ? (
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                          ) : isLoadingPv ? (
                            <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                          ) : file.type === "image" ? (
                            <ImageIcon className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Film className="w-4 h-4 text-gray-600" />
                          )}
                        </div>

                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors duration-100 ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">{file.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[140px]" title={file.path}>{file.path}</span>
                            <span className="text-[10px] text-gray-600">{formatSizeShort(file.size)}</span>
                            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${file.type === "video" ? "bg-red-900/50 text-red-400" : "bg-gray-800 text-gray-400"}`}>{file.type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Fragment>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-800 flex items-center gap-3 bg-gray-900 shrink-0">
            <button onClick={fetchMegaFiles} disabled={isLoading || isImporting} className="p-2.5 rounded-xl hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200 disabled:opacity-40" title="Refresh" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || isImporting}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-100 ${selected.size === 0 || isImporting ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98]"}`}
            >
              {isImporting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>) : (<><Download className="w-4 h-4" /> Import {selected.size > 0 ? `(${selected.size})` : ""}</>)}
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
