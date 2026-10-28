import React, { useState, useEffect, useRef } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { loadPdfJsDoc, renderPageToCanvas, ensureFreshBuffer } from '../services/pdfEngine';
import type * as pdfjsLib from 'pdfjs-dist';
import {
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Printer,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface PdfPreviewerViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

export const PdfPreviewerView: React.FC<PdfPreviewerViewProps> = ({
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load document
  useEffect(() => {
    if (!currentFile) {
      setPdfDoc(null);
      return;
    }
    ensureFreshBuffer(currentFile)
      .then((buf) => loadPdfJsDoc(buf))
      .then((doc) => {
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load PDF preview');
      });
  }, [currentFile]);

  // Render active page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    setIsRendering(true);
    renderPageToCanvas(pdfDoc, currentPage, canvasRef.current, scale)
      .catch((err) => {
        setError(err?.message || 'Page render error');
      })
      .finally(() => {
        setIsRendering(false);
      });
  }, [pdfDoc, currentPage, scale]);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
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

  const handlePrint = () => {
    window.print();
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
          <Eye className="w-4 h-4" />
          <span>High-Fidelity Viewer</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">PDF Preview & Viewer</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Navigate, inspect layout fidelity, zoom vector details, and print through your browser.
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to inspect"
          description="High-resolution client-side canvas renderer."
        />
      ) : (
        <div className="space-y-4">
          {/* Viewer Toolbar */}
          <div className="p-3.5 rounded-xl bg-[#151923] border border-[#282D3A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-white truncate max-w-[200px]">
                {currentFile.file.name}
              </span>
              <span className="text-[#9CA3AF] font-mono">
                ({currentPage} of {totalPages})
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 font-mono text-xs">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    if (!isNaN(num) && num >= 1 && num <= totalPages) setCurrentPage(num);
                  }}
                  className="w-12 px-1.5 py-1 bg-[#0B0D12] border border-[#282D3A] rounded text-center text-white focus:outline-none focus:border-[#8B5CF6]"
                />
                <span className="text-[#9CA3AF]">/ {totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom & Print */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
                className="p-1.5 rounded bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] text-[#7DD3FC] w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                className="p-1.5 rounded bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                title="Print document"
              >
                <Printer className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setCurrentFile(null)}
                className="px-2.5 py-1.5 text-xs text-[#9CA3AF] hover:text-white rounded hover:bg-[#0B0D12] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Canvas Viewport Frame */}
          <div className="relative w-full overflow-auto max-h-[700px] p-6 rounded-2xl bg-[#0B0D12] border border-[#282D3A] flex items-center justify-center">
            {isRendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B0D12]/60 backdrop-blur-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="max-w-full shadow-2xl rounded border border-slate-800 bg-white"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
