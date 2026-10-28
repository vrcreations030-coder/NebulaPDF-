import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { extractAllText, downloadBlob, loadPdfJsDoc, ensureFreshBuffer } from '../services/pdfEngine';
import type { ExtractedPageText } from '../types';
import {
  FileText,
  ArrowLeft,
  Download,
  Copy,
  Check,
  Search,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface TextExtractorViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

export const TextExtractorView: React.FC<TextExtractorViewProps> = ({
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [extractedPages, setExtractedPages] = useState<ExtractedPageText[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setExtractedPages([]);
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      const uploaded: UploadedPDFFile = { file: f, buffer, pageCount: doc.numPages };
      setCurrentFile(uploaded);
      onAddSharedFiles([uploaded]);
      // Auto-extract text
      performExtraction(buffer);
    } catch (err: any) {
      setError(err?.message || 'Failed to open PDF.');
    }
  };

  const performExtraction = async (buffer: ArrayBuffer) => {
    setIsExtracting(true);
    setError(null);
    try {
      const results = await extractAllText(buffer);
      setExtractedPages(results);
    } catch (err: any) {
      setError(err?.message || 'Failed to extract text from document.');
    } finally {
      setIsExtracting(false);
    }
  };

  // If a shared file is already selected but not extracted
  React.useEffect(() => {
    if (currentFile && extractedPages.length === 0 && !isExtracting) {
      ensureFreshBuffer(currentFile)
        .then((buf) => performExtraction(buf))
        .catch(() => {});
    }
  }, [currentFile]);

  const fullText = extractedPages
    .map((p) => `--- PAGE ${p.pageNumber} ---\n\n${p.text}`)
    .join('\n\n\n');

  const totalWords = fullText
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!currentFile) return;
    const baseName = currentFile.file.name.replace(/\.pdf$/i, '');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${baseName}_extracted_text.txt`, 'text/plain');
  };

  const filteredPages = searchFilter.trim()
    ? extractedPages.filter((p) => p.text.toLowerCase().includes(searchFilter.toLowerCase()))
    : extractedPages;

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
          <FileText className="w-4 h-4" />
          <span>Text Decoupler</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">PDF Text Extractor</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Extract raw selectable text from your document page by page. Download as plain text or copy to clipboard.
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to extract text"
          description="Decodes all selectable fonts and text layers in browser memory."
        />
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">{currentFile.file.name}</p>
              <p className="text-xs text-[#9CA3AF] font-mono">
                {currentFile.pageCount} pages · {totalWords.toLocaleString()} words · {fullText.length.toLocaleString()} characters
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={isExtracting || extractedPages.length === 0}
                className="px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#7DD3FC]" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
              <button
                onClick={handleDownloadTxt}
                disabled={isExtracting || extractedPages.length === 0}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .TXT</span>
              </button>
              <button
                onClick={() => {
                  setCurrentFile(null);
                  setExtractedPages([]);
                }}
                className="px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg transition-colors cursor-pointer"
              >
                Change PDF
              </button>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search extracted text across pages..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#151923] border border-[#282D3A] rounded-xl text-xs text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          {/* Extracted Text Display */}
          {isExtracting ? (
            <div className="p-12 text-center rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6] mx-auto" />
              <p className="text-xs text-[#9CA3AF]">Extracting selectable text from all pages...</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
              {filteredPages.map((p) => (
                <div
                  key={p.pageNumber}
                  className="p-5 rounded-xl bg-[#151923] border border-[#282D3A] space-y-2 select-text"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#282D3A]/60 text-xs">
                    <span className="font-mono font-bold text-[#8B5CF6]">Page {p.pageNumber}</span>
                    <span className="text-[11px] font-mono text-[#9CA3AF]">
                      {p.text.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {p.text || <span className="text-slate-500 italic">(No selectable text on this page — may be an image scan. Use OCR Reader if needed.)</span>}
                  </p>
                </div>
              ))}
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
