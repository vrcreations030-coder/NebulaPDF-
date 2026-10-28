import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import {
  splitPdf,
  extractPages,
  deletePages,
  downloadBlob,
  loadPdfJsDoc,
  ensureFreshBuffer,
} from '../services/pdfEngine';
import type { ToolId } from '../types';
import JSZip from 'jszip';
import {
  Scissors,
  FileOutput,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Check,
  Split,
} from 'lucide-react';

interface SplitExtractToolViewProps {
  toolId: 'split' | 'extract' | 'delete-pages';
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

export const SplitExtractToolView: React.FC<SplitExtractToolViewProps> = ({
  toolId,
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [totalPages, setTotalPages] = useState<number>(currentFile?.pageCount || 0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([1]));
  const [rangeInput, setRangeInput] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{ blob: Uint8Array | Blob; name: string } | null>(null);

  // Sync total pages if current file is present
  React.useEffect(() => {
    if (currentFile) {
      ensureFreshBuffer(currentFile)
        .then((buf) => loadPdfJsDoc(buf))
        .then((doc) => {
          setTotalPages(doc.numPages);
          if (rangeInput === '1' && doc.numPages > 1 && toolId === 'split') {
            const mid = Math.ceil(doc.numPages / 2);
            setRangeInput(`1-${mid}, ${mid + 1}-${doc.numPages}`);
          }
        })
        .catch((err) => {
          setError(err?.message || 'Failed to inspect PDF');
        });
    }
  }, [currentFile, toolId]);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setResultData(null);
    const f = files[0];
    try {
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      const pages = doc.numPages;
      const uploaded: UploadedPDFFile = { file: f, buffer, pageCount: pages };
      setCurrentFile(uploaded);
      setTotalPages(pages);
      onAddSharedFiles([uploaded]);
      setSelectedPages(new Set([1]));

      if (toolId === 'split' && pages > 1) {
        const mid = Math.ceil(pages / 2);
        setRangeInput(`1-${mid}, ${mid + 1}-${pages}`);
      } else {
        setRangeInput('1');
      }
    } catch (err: any) {
      setError(`Failed to read PDF: ${err?.message}`);
    }
  };

  const togglePage = (pageNum: number) => {
    const next = new Set(selectedPages);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setSelectedPages(next);
    const arr = Array.from(next).sort((a, b) => a - b);
    setRangeInput(arr.join(', '));
  };

  const selectAll = () => {
    const all = new Set<number>();
    for (let i = 1; i <= totalPages; i++) all.add(i);
    setSelectedPages(all);
    setRangeInput(`1-${totalPages}`);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
    setRangeInput('');
  };

  const setSplitEveryPage = () => {
    if (totalPages <= 0) return;
    const parts = [];
    for (let i = 1; i <= totalPages; i++) parts.push(`${i}`);
    setRangeInput(parts.join(', '));
  };

  const setSplitInHalf = () => {
    if (totalPages <= 1) return;
    const mid = Math.ceil(totalPages / 2);
    setRangeInput(`1-${mid}, ${mid + 1}-${totalPages}`);
  };

  const handleRangeInputChange = (text: string) => {
    setRangeInput(text);
    try {
      const parsed = new Set<number>();
      const parts = text.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [startStr, endStr] = trimmed.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              if (i >= 1 && i <= totalPages) parsed.add(i);
            }
          }
        } else {
          const num = parseInt(trimmed, 10);
          if (!isNaN(num) && num >= 1 && num <= totalPages) {
            parsed.add(num);
          }
        }
      }
      setSelectedPages(parsed);
    } catch {
      // ignore typing errors
    }
  };

  const executeAction = async () => {
    if (!currentFile) {
      setError('Please upload a PDF document first.');
      return;
    }
    setError(null);
    setIsProcessing(true);
    setResultData(null);

    const baseName = currentFile.file.name.replace(/\.pdf$/i, '');

    try {
      const validBuffer = await ensureFreshBuffer(currentFile);

      if (toolId === 'extract') {
        const pageArr = Array.from(selectedPages).sort((a, b) => a - b);
        if (pageArr.length === 0) {
          throw new Error('Please select at least 1 page to extract.');
        }
        const extracted = await extractPages(validBuffer, pageArr);
        setResultData({
          blob: extracted,
          name: `${baseName}_extracted_pages.pdf`,
        });
      } else if (toolId === 'delete-pages') {
        const toDelete = Array.from(selectedPages);
        if (toDelete.length === 0) {
          throw new Error('Please select at least 1 page to delete.');
        }
        if (toDelete.length >= totalPages) {
          throw new Error('Cannot delete all pages from the document.');
        }
        const remaining = await deletePages(validBuffer, toDelete);
        setResultData({
          blob: remaining,
          name: `${baseName}_pages_removed.pdf`,
        });
      } else if (toolId === 'split') {
        const rangeParts = rangeInput.split(',').map((p) => p.trim()).filter(Boolean);
        const parsedRanges: { start: number; end: number }[] = [];

        for (const part of rangeParts) {
          if (part.includes('-')) {
            const [sStr, eStr] = part.split('-').map((s) => s.trim());
            const s = Number(sStr);
            const e = Number(eStr);
            if (isNaN(s) || isNaN(e)) {
              throw new Error(`Invalid range "${part}". Please use numbers, e.g. "1-3" or "5".`);
            }
            if (s > e) {
              throw new Error(`Invalid range "${part}": starting page ${s} cannot be greater than ending page ${e}.`);
            }
            if (s < 1 || e > totalPages) {
              throw new Error(`Range "${part}" is out of bounds. Document only has ${totalPages} pages.`);
            }
            parsedRanges.push({ start: s, end: e });
          } else {
            const n = Number(part);
            if (isNaN(n) || n < 1 || n > totalPages) {
              throw new Error(`Page "${part}" is out of range. Enter pages between 1 and ${totalPages}.`);
            }
            parsedRanges.push({ start: n, end: n });
          }
        }

        if (parsedRanges.length === 0) {
          throw new Error('Please enter at least one valid page range, e.g. "1-2, 3-5".');
        }

        const splitDocs = await splitPdf(validBuffer, parsedRanges);

        if (splitDocs.length === 1) {
          setResultData({
            blob: splitDocs[0],
            name: `${baseName}_split.pdf`,
          });
        } else {
          const zip = new JSZip();
          splitDocs.forEach((docBytes, idx) => {
            const r = parsedRanges[idx];
            const rangeLabel = r.start === r.end ? `page_${r.start}` : `pages_${r.start}-${r.end}`;
            zip.file(`${baseName}_part_${idx + 1}_${rangeLabel}.pdf`, docBytes);
          });
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          setResultData({
            blob: zipBlob,
            name: `${baseName}_split_bundle.zip`,
          });
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultData) return;
    downloadBlob(
      resultData.blob,
      resultData.name,
      resultData.name.endsWith('.zip') ? 'application/zip' : 'application/pdf'
    );
  };

  const titles = {
    split: {
      tag: 'Divide Document',
      title: 'Split PDF into Parts',
      desc: 'Separate pages or custom ranges into standalone documents with automatic ZIP archiving.',
      actionText: 'Split Document',
      icon: Scissors,
    },
    extract: {
      tag: 'Selective Extraction',
      title: 'Extract Pages from PDF',
      desc: 'Pick specific pages and compile them into a new lightweight document.',
      actionText: 'Extract Selected Pages',
      icon: FileOutput,
    },
    'delete-pages': {
      tag: 'Page Purge',
      title: 'Delete Pages from PDF',
      desc: 'Select unnecessary or blank pages to permanently eliminate.',
      actionText: 'Delete Selected Pages',
      icon: Trash2,
    },
  }[toolId];

  const IconComp = titles.icon;

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
          <IconComp className="w-4 h-4" />
          <span>{titles.tag}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{titles.title}</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">{titles.desc}</p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFileSelected}
          title="Upload PDF to organize pages"
          description="Pages will be rendered in browser memory for precise selection."
        />
      ) : (
        <div className="space-y-6">
          {/* Active Document Info */}
          <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#171329] border border-[#282D3A] flex items-center justify-center text-[#7DD3FC]">
                <IconComp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{currentFile.file.name}</p>
                <p className="text-xs text-[#9CA3AF] font-mono">
                  {totalPages} pages · {Math.round(currentFile.file.size / 1024)} KB
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setCurrentFile(null);
                setResultData(null);
                setError(null);
              }}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg transition-colors cursor-pointer"
            >
              Change Document
            </button>
          </div>

          {/* Range Configuration & Quick Selectors */}
          <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-semibold text-white">
                {toolId === 'split' ? 'Split Ranges (e.g. 1-2, 3-5 or 1, 2, 3):' : 'Selected Pages (comma separated):'}
              </label>
              <div className="flex items-center gap-2">
                {toolId === 'split' && (
                  <>
                    <button
                      onClick={setSplitEveryPage}
                      className="px-2.5 py-1 text-xs bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                      title="Split every single page into individual PDFs"
                    >
                      Every Page
                    </button>
                    {totalPages > 1 && (
                      <button
                        onClick={setSplitInHalf}
                        className="px-2.5 py-1 text-xs bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                        title="Split into two equal halves"
                      >
                        In Half
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1 text-xs bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-2.5 py-1 text-xs bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <input
              type="text"
              value={rangeInput}
              onChange={(e) => handleRangeInputChange(e.target.value)}
              placeholder="e.g. 1-2, 3-5"
              className="w-full px-3.5 py-2.5 bg-[#0B0D12] border border-[#282D3A] rounded-xl text-xs text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6]"
            />

            {/* Interactive Grid of Page Numbers */}
            <div className="pt-2">
              <p className="text-[11px] text-[#9CA3AF] mb-2">
                {toolId === 'delete-pages'
                  ? 'Click pages to mark for deletion (highlighted in red):'
                  : 'Click pages to toggle selection:'}
              </p>

              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2 max-h-56 overflow-y-auto p-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  const isSelected = selectedPages.has(pNum);
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => togglePage(pNum)}
                      className={`h-10 rounded-lg text-xs font-mono font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
                        isSelected
                          ? toolId === 'delete-pages'
                            ? 'bg-rose-950/70 border-rose-600 text-rose-200'
                            : 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-sm'
                          : 'bg-[#0B0D12] border-[#282D3A] text-[#9CA3AF] hover:border-slate-500'
                      }`}
                    >
                      <span>{pNum}</span>
                      {isSelected && (
                        <span className="text-[9px] font-sans font-normal opacity-80">
                          {toolId === 'delete-pages' ? 'delete' : 'keep'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#282D3A] flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF]">
                {toolId === 'split'
                  ? `Split plan: ${rangeInput}`
                  : `${selectedPages.size} of ${totalPages} pages selected`}
              </span>

              <button
                onClick={executeAction}
                disabled={isProcessing || !rangeInput.trim()}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                  toolId === 'delete-pages'
                    ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-40'
                    : 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-40'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Document...</span>
                  </>
                ) : (
                  <>
                    <IconComp className="w-4 h-4" />
                    <span>{titles.actionText}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Result & Download Banner */}
      {resultData && (
        <div className="p-5 rounded-2xl bg-[#171329] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Document Processed Successfully!</h3>
              <p className="text-xs text-[#9CA3AF] font-mono">
                {resultData.name} ({Math.round(('byteLength' in resultData.blob ? resultData.blob.byteLength : resultData.blob.size) / 1024)} KB)
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
