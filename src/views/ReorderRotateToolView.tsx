import React, { useState, useEffect } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import {
  loadPdfJsDoc,
  renderPageToDataUrl,
  reorderPages,
  rotatePdf,
  downloadBlob,
  ensureFreshBuffer,
} from '../services/pdfEngine';
import type { ToolId } from '../types';
import {
  RotateCw,
  RotateCcw,
  ArrowUpDown,
  ArrowLeft,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ReorderRotateToolViewProps {
  toolId: 'reorder' | 'rotate';
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

interface PageItem {
  pageNumber: number; // original 1-indexed
  thumbnailUrl: string;
  rotation: number; // 0, 90, 180, 270
}

export const ReorderRotateToolView: React.FC<ReorderRotateToolViewProps> = ({
  toolId,
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Uint8Array | null>(null);

  // Render thumbnails on upload
  useEffect(() => {
    if (!currentFile) {
      setPages([]);
      return;
    }

    let isCancelled = false;
    const generateThumbs = async () => {
      setLoadingThumbnails(true);
      setError(null);
      setResultBlob(null);

      try {
        const safeBuf = await ensureFreshBuffer(currentFile);
        const doc = await loadPdfJsDoc(safeBuf);
        const total = doc.numPages;
        const items: PageItem[] = [];

        // Render thumbnails for each page (max 40 for memory safety)
        const renderLimit = Math.min(total, 40);
        for (let i = 1; i <= renderLimit; i++) {
          if (isCancelled) return;
          const dataUrl = await renderPageToDataUrl(doc, i, 0.45, 'image/jpeg', 0.8);
          items.push({
            pageNumber: i,
            thumbnailUrl: dataUrl,
            rotation: 0,
          });
        }

        // Fill remaining if above 40
        for (let i = renderLimit + 1; i <= total; i++) {
          items.push({
            pageNumber: i,
            thumbnailUrl: '',
            rotation: 0,
          });
        }

        if (!isCancelled) {
          setPages(items);
        }
      } catch (err: any) {
        if (!isCancelled) setError(`Failed to render thumbnails: ${err?.message}`);
      } finally {
        if (!isCancelled) setLoadingThumbnails(false);
      }
    };

    generateThumbs();

    return () => {
      isCancelled = true;
    };
  }, [currentFile]);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      const uploaded: UploadedPDFFile = { file: f, buffer, pageCount: doc.numPages };
      setCurrentFile(uploaded);
      onAddSharedFiles([uploaded]);
    } catch (err: any) {
      setError(err?.message || 'Failed to open PDF');
    }
  };

  // Rotation functions
  const rotateIndividual = (index: number, degrees: number) => {
    const updated = [...pages];
    updated[index].rotation = (updated[index].rotation + degrees + 360) % 360;
    setPages(updated);
  };

  const rotateAll = (degrees: number) => {
    const updated = pages.map((p) => ({
      ...p,
      rotation: (p.rotation + degrees + 360) % 360,
    }));
    setPages(updated);
  };

  // Reorder functions
  const movePage = (index: number, direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? index - 1 : index + 1;
    if (target < 0 || target >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);
    setPages(updated);
  };

  const handleSave = async () => {
    if (!currentFile || pages.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setResultBlob(null);

    try {
      const safeBuffer = await ensureFreshBuffer(currentFile);
      let outputBuffer: Uint8Array;

      if (toolId === 'reorder') {
        // Execute reorder
        const newOrder = pages.map((p) => p.pageNumber);
        outputBuffer = await reorderPages(safeBuffer, newOrder);
      } else {
        // Execute rotation map
        const rotationMap: Record<number, number> = {};
        pages.forEach((p) => {
          if (p.rotation !== 0) {
            rotationMap[p.pageNumber] = p.rotation;
          }
        });
        outputBuffer = await rotatePdf(safeBuffer, rotationMap);
      }

      setResultBlob(outputBuffer);
    } catch (err: any) {
      setError(err?.message || 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !currentFile) return;
    const baseName = currentFile.file.name.replace(/\.pdf$/i, '');
    const suffix = toolId === 'rotate' ? '_rotated.pdf' : '_reordered.pdf';
    downloadBlob(resultBlob, `${baseName}${suffix}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tools</span>
      </button>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
          {toolId === 'rotate' ? <RotateCw className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
          <span>{toolId === 'rotate' ? 'Page Orientation' : 'Sequence Organizer'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {toolId === 'rotate' ? 'Rotate PDF Pages' : 'Reorder PDF Pages'}
        </h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          {toolId === 'rotate'
            ? 'Rotate individual pages or the entire document clockwise / counter-clockwise.'
            : 'Rearrange page order with visual thumbnails and instant responsive controls.'}
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to manage page sequence"
          description="Renders lightweight thumbnails locally on your device."
        />
      ) : (
        <div className="space-y-6">
          {/* Active File Bar & Batch Actions */}
          <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">{currentFile.file.name}</p>
              <p className="text-xs text-[#9CA3AF] font-mono">
                {pages.length} pages · {Math.round(currentFile.file.size / 1024)} KB
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {toolId === 'rotate' && (
                <>
                  <button
                    onClick={() => rotateAll(90)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B0D12] border border-[#282D3A] hover:border-[#8B5CF6] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Rotate All +90°</span>
                  </button>
                  <button
                    onClick={() => rotateAll(-90)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B0D12] border border-[#282D3A] hover:border-[#8B5CF6] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#7DD3FC]" />
                    <span>Rotate All -90°</span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setCurrentFile(null);
                  setResultBlob(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg transition-colors cursor-pointer"
              >
                Change Document
              </button>
            </div>
          </div>

          {/* Thumbnails Grid */}
          {loadingThumbnails ? (
            <div className="p-12 text-center rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6] mx-auto" />
              <p className="text-xs text-[#9CA3AF]">Rendering local page thumbnails...</p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>
                  Showing {pages.length} pages {toolId === 'reorder' ? '(use arrows to shift position)' : ''}
                </span>
                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exporting PDF...</span>
                    </>
                  ) : (
                    <span>Save {toolId === 'rotate' ? 'Rotated' : 'Reordered'} PDF</span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[550px] overflow-y-auto p-1">
                {pages.map((page, index) => (
                  <div
                    key={`${page.pageNumber}-${index}`}
                    className="p-3 rounded-xl bg-[#0B0D12] border border-[#282D3A] hover:border-[#8B5CF6]/50 transition-all flex flex-col justify-between space-y-2 group"
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
                      <span className="font-bold text-white">Pos {index + 1}</span>
                      <span className="text-slate-400">Orig p.{page.pageNumber}</span>
                    </div>

                    {/* Thumbnail image with rotation */}
                    <div className="aspect-[3/4] bg-[#151923] rounded-lg overflow-hidden flex items-center justify-center border border-[#282D3A]/60 p-1">
                      {page.thumbnailUrl ? (
                        <img
                          src={page.thumbnailUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="max-h-full max-w-full object-contain transition-transform duration-200"
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        />
                      ) : (
                        <span className="text-xs font-mono text-[#9CA3AF]">Page {page.pageNumber}</span>
                      )}
                    </div>

                    {/* Controls per page */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#282D3A]/60">
                      {toolId === 'reorder' ? (
                        <div className="flex items-center justify-between w-full">
                          <button
                            type="button"
                            onClick={() => movePage(index, 'prev')}
                            disabled={index === 0}
                            className="p-1 text-[#9CA3AF] hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move left"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] text-[#9CA3AF]">#{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => movePage(index, 'next')}
                            disabled={index === pages.length - 1}
                            className="p-1 text-[#9CA3AF] hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move right"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <button
                            type="button"
                            onClick={() => rotateIndividual(index, -90)}
                            className="p-1 text-[#9CA3AF] hover:text-[#7DD3FC] cursor-pointer"
                            title="Rotate -90°"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-mono text-[#8B5CF6]">
                            {page.rotation}°
                          </span>
                          <button
                            type="button"
                            onClick={() => rotateIndividual(index, 90)}
                            className="p-1 text-[#9CA3AF] hover:text-[#8B5CF6] cursor-pointer"
                            title="Rotate +90°"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {resultBlob && currentFile && (
        <div className="p-5 rounded-2xl bg-[#171329] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Document Ready!</h3>
              <p className="text-xs text-[#9CA3AF]">
                Generated {Math.round(resultBlob.byteLength / 1024)} KB PDF.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <Download className="w-4 h-4" />
            <span>Download Result</span>
          </button>
        </div>
      )}
    </div>
  );
};
