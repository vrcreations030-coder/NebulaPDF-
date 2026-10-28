import React, { useState, useEffect, useRef } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import {
  loadPdfJsDoc,
  renderPageToCanvas,
  burnAnnotations,
  downloadBlob,
  ensureFreshBuffer,
} from '../services/pdfEngine';
import type * as pdfjsLib from 'pdfjs-dist';
import {
  PenTool,
  ArrowLeft,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Type,
  Highlighter,
  Square,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface AnnotationItem {
  pageNumber: number;
  type: 'text' | 'highlight' | 'rectangle';
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface AnnotationToolViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

export const AnnotationToolView: React.FC<AnnotationToolViewProps> = ({
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
  const [activeTool, setActiveTool] = useState<'text' | 'highlight' | 'rectangle'>('text');
  const [customText, setCustomText] = useState('APPROVED');
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Uint8Array | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

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
      .catch((err) => setError(err?.message || 'Failed to render PDF'));
  }, [currentFile]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    renderPageToCanvas(pdfDoc, currentPage, canvasRef.current, 1.2).catch(() => {});
  }, [pdfDoc, currentPage]);

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
      setError(err?.message || 'Failed to load PDF');
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnot: AnnotationItem = {
      pageNumber: currentPage,
      type: activeTool,
      text: activeTool === 'text' ? customText : undefined,
      x: Math.round(clickX),
      y: Math.round(clickY),
      width: activeTool === 'highlight' ? 25 : 20,
      height: activeTool === 'highlight' ? 4 : 8,
    };

    setAnnotations((prev) => [...prev, newAnnot]);
  };

  const handleBurn = async () => {
    if (!currentFile || annotations.length === 0) {
      setError('Please place at least one annotation or stamp.');
      return;
    }
    setError(null);
    setIsProcessing(true);
    setResultBlob(null);

    try {
      const safeBuf = await ensureFreshBuffer(currentFile);
      const output = await burnAnnotations(safeBuf, annotations);
      setResultBlob(output);
    } catch (err: any) {
      setError(err?.message || 'Failed to burn annotations into PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !currentFile) return;
    const baseName = currentFile.file.name.replace(/\.pdf$/i, '');
    downloadBlob(resultBlob, `${baseName}_annotated.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tools</span>
      </button>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
          <PenTool className="w-4 h-4" />
          <span>Visual Overlay Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Annotation Studio</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Place vector text callouts, yellow highlight bands, and focus rectangles onto document pages.
        </p>
      </div>

      <div className="p-3.5 rounded-xl bg-[#151923] border border-[#282D3A] flex items-start gap-3 text-xs text-[#9CA3AF]">
        <Info className="w-4 h-4 shrink-0 text-[#7DD3FC] mt-0.5" />
        <span>
          <strong>Engineering Note:</strong> Annotations are burned as vector overlays on top of the document layer. They do not alter or delete the underlying original encrypted font stream.
        </span>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to annotate"
          description="Interactive overlay canvas with real PDF vector burn-in."
        />
      ) : (
        <div className="space-y-4">
          {/* Tools & Pagination Bar */}
          <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Tool Selection */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTool('text')}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'bg-[#0B0D12] text-[#9CA3AF] border-[#282D3A]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Stamp</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('highlight')}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'highlight'
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'bg-[#0B0D12] text-[#9CA3AF] border-[#282D3A]'
                }`}
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span>Highlighter</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('rectangle')}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'rectangle'
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'bg-[#0B0D12] text-[#9CA3AF] border-[#282D3A]'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Border Box</span>
              </button>
            </div>

            {/* Custom text input */}
            {activeTool === 'text' && (
              <div className="flex items-center gap-2">
                <span className="text-[#9CA3AF]">Stamp text:</span>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="px-2.5 py-1 bg-[#0B0D12] border border-[#282D3A] rounded text-white text-xs"
                />
              </div>
            )}

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded bg-[#0B0D12] border border-[#282D3A] text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs text-white">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded bg-[#0B0D12] border border-[#282D3A] text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Action */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnnotations([])}
                disabled={annotations.length === 0}
                className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-30 cursor-pointer"
              >
                Clear ({annotations.length})
              </button>
              <button
                onClick={handleBurn}
                disabled={isProcessing || annotations.length === 0}
                className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] disabled:opacity-40 rounded-lg cursor-pointer"
              >
                {isProcessing ? 'Burning...' : 'Export Annotated PDF'}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[#9CA3AF] text-center">
            Click anywhere on the document canvas below to stamp the active {activeTool}.
          </p>

          {/* Interactive Canvas Overlay Container */}
          <div className="relative w-full overflow-auto max-h-[600px] p-4 rounded-2xl bg-[#0B0D12] border border-[#282D3A] flex items-center justify-center">
            <div
              ref={overlayRef}
              onClick={handleCanvasClick}
              className="relative cursor-crosshair shadow-2xl rounded border border-slate-700 overflow-hidden bg-white"
            >
              <canvas ref={canvasRef} className="block pointer-events-none" />

              {/* Render placed annotations on this page */}
              {annotations
                .filter((a) => a.pageNumber === currentPage)
                .map((a, idx) => (
                  <div
                    key={idx}
                    style={{
                      left: `${a.x}%`,
                      top: `${a.y}%`,
                      width: a.width ? `${a.width}%` : undefined,
                      height: a.height ? `${a.height}%` : undefined,
                    }}
                    className={`absolute pointer-events-none text-xs font-bold ${
                      a.type === 'text'
                        ? 'text-rose-600 bg-white/80 px-1.5 py-0.5 rounded border border-rose-500 shadow-sm'
                        : a.type === 'highlight'
                        ? 'bg-yellow-300/50 border border-yellow-400'
                        : 'border-2 border-[#8B5CF6] bg-[#8B5CF6]/10'
                    }`}
                  >
                    {a.type === 'text' && a.text}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {resultBlob && (
        <div className="p-5 rounded-2xl bg-[#171329] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Annotations Burned Successfully!</h3>
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
            <span>Download Annotated PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
