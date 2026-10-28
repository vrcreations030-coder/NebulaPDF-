import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { addPageNumbers, downloadBlob, loadPdfJsDoc, ensureFreshBuffer } from '../services/pdfEngine';
import {
  Hash,
  ArrowLeft,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface PageNumbersToolViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

export const PageNumbersToolView: React.FC<PageNumbersToolViewProps> = ({
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right' | 'bottom-left'>('bottom-center');
  const [format, setFormat] = useState<'Page X of Y' | 'X / Y' | 'X' | '- X -'>('Page X of Y');
  const [startFrom, setStartFrom] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Uint8Array | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setResultBlob(null);
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      const uploaded: UploadedPDFFile = { file: f, buffer, pageCount: doc.numPages };
      setCurrentFile(uploaded);
      onAddSharedFiles([uploaded]);
    } catch (err: any) {
      setError(err?.message || 'Failed to read PDF file.');
    }
  };

  const handleApply = async () => {
    if (!currentFile) return;
    setError(null);
    setIsProcessing(true);
    setResultBlob(null);

    try {
      const safeBuf = await ensureFreshBuffer(currentFile);
      const bytes = await addPageNumbers(safeBuf, {
        position,
        format,
        startFrom,
        fontSize,
      });
      setResultBlob(bytes);
    } catch (err: any) {
      setError(err?.message || 'Failed to stamp page numbers.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !currentFile) return;
    const baseName = currentFile.file.name.replace(/\.pdf$/i, '');
    downloadBlob(resultBlob, `${baseName}_numbered.pdf`);
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
          <Hash className="w-4 h-4" />
          <span>Document Pagination</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Add Page Numbers</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Insert professional pagination headers and footers with custom formats and alignments.
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to add page numbers"
          description="Embeds crisp vector typography on every page."
        />
      ) : (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{currentFile.file.name}</p>
                <p className="text-xs text-[#9CA3AF] font-mono">
                  {currentFile.pageCount} pages · {Math.round(currentFile.file.size / 1024)} KB
                </p>
              </div>

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

            {/* Pagination Settings */}
            <div className="pt-3 border-t border-[#282D3A] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Position:</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="bottom-center">Bottom Center (Classic)</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right (Header)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Numbering Format:</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="Page X of Y">Page 1 of {currentFile.pageCount || 10}</option>
                  <option value="X / Y">1 / {currentFile.pageCount || 10}</option>
                  <option value="X">1</option>
                  <option value="- X -">— 1 —</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Start From:</label>
                <input
                  type="number"
                  min="1"
                  value={startFrom}
                  onChange={(e) => setStartFrom(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Font Size: ({fontSize}pt)</label>
                <input
                  type="range"
                  min="8"
                  max="18"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-[#8B5CF6] mt-2"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleApply}
                disabled={isProcessing}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-40 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Numbering Pages...</span>
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4" />
                    <span>Stamp Numbers on All Pages</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {resultBlob && (
            <div className="p-5 rounded-2xl bg-[#171329] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pages Numbered Successfully!</h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Document ready for printing and archival distribution.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <Download className="w-4 h-4" />
                <span>Download Numbered PDF</span>
              </button>
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
    </div>
  );
};
