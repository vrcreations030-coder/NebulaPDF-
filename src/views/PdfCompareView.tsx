import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { extractAllText, loadPdfJsDoc, ensureFreshBuffer } from '../services/pdfEngine';
import {
  Columns2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  FileText,
  Diff,
} from 'lucide-react';

interface PdfCompareViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
}

export const PdfCompareView: React.FC<PdfCompareViewProps> = ({ onBack, sharedFiles }) => {
  const [docA, setDocA] = useState<UploadedPDFFile | null>(sharedFiles[0] || null);
  const [docB, setDocB] = useState<UploadedPDFFile | null>(sharedFiles[1] || null);
  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectA = async (files: File[]) => {
    if (!files.length) return;
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      setDocA({ file: f, buffer, pageCount: doc.numPages });
      setTextA('');
    } catch (err: any) {
      setError(err?.message || 'Failed to read Document A');
    }
  };

  const handleSelectB = async (files: File[]) => {
    if (!files.length) return;
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      setDocB({ file: f, buffer, pageCount: doc.numPages });
      setTextB('');
    } catch (err: any) {
      setError(err?.message || 'Failed to read Document B');
    }
  };

  const executeCompare = async () => {
    if (!docA || !docB) {
      setError('Please provide two PDF documents to compare.');
      return;
    }
    setError(null);
    setIsComparing(true);

    try {
      const [bufA, bufB] = await Promise.all([
        ensureFreshBuffer(docA),
        ensureFreshBuffer(docB),
      ]);
      const [pagesA, pagesB] = await Promise.all([
        extractAllText(bufA),
        extractAllText(bufB),
      ]);

      const rawA = pagesA.map((p) => p.text).join('\n');
      const rawB = pagesB.map((p) => p.text).join('\n');
      setTextA(rawA);
      setTextB(rawB);
    } catch (err: any) {
      setError(err?.message || 'Failed to extract text for comparison.');
    } finally {
      setIsComparing(false);
    }
  };

  // Simple line-by-line diff calculator
  const linesA = textA.split('\n').map((l) => l.trim()).filter(Boolean);
  const linesB = textB.split('\n').map((l) => l.trim()).filter(Boolean);
  const setB = new Set(linesB);
  const setA = new Set(linesA);

  const wordsA = textA.split(/\s+/).filter(Boolean).length;
  const wordsB = textB.split(/\s+/).filter(Boolean).length;
  const wordDiff = wordsB - wordsA;

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
          <Columns2 className="w-4 h-4" />
          <span>Semantic Document Diff</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">PDF Compare</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Compare extracted text between two document revisions. Detect inserted, modified, and removed clauses.
        </p>
      </div>

      {/* Two Document Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document A */}
        <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7DD3FC] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Document A (Original)
            </span>
            {docA && (
              <button
                onClick={() => setDocA(null)}
                className="text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                Change
              </button>
            )}
          </div>

          {!docA ? (
            <DropZone onFilesSelected={handleSelectA} title="Choose Original Document" />
          ) : (
            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#282D3A] text-xs">
              <p className="font-semibold text-white truncate">{docA.file.name}</p>
              <p className="text-[#9CA3AF] font-mono mt-0.5">
                {docA.pageCount} pages · {Math.round(docA.file.size / 1024)} KB
              </p>
            </div>
          )}
        </div>

        {/* Document B */}
        <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5CF6] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Document B (Modified Revision)
            </span>
            {docB && (
              <button
                onClick={() => setDocB(null)}
                className="text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                Change
              </button>
            )}
          </div>

          {!docB ? (
            <DropZone onFilesSelected={handleSelectB} title="Choose Revised Document" />
          ) : (
            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#282D3A] text-xs">
              <p className="font-semibold text-white truncate">{docB.file.name}</p>
              <p className="text-[#9CA3AF] font-mono mt-0.5">
                {docB.pageCount} pages · {Math.round(docB.file.size / 1024)} KB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compare Button */}
      {docA && docB && (
        <div className="flex justify-center">
          <button
            onClick={executeCompare}
            disabled={isComparing}
            className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {isComparing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting & Comparing Text...</span>
              </>
            ) : (
              <>
                <Diff className="w-4 h-4" />
                <span>Compare Extracted Text</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Compare Results Display */}
      {textA && textB && (
        <div className="space-y-4">
          {/* Differential Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#151923] border border-[#282D3A] text-xs">
              <span className="text-[#9CA3AF] block font-mono">Original Words</span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">{wordsA.toLocaleString()}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#151923] border border-[#282D3A] text-xs">
              <span className="text-[#9CA3AF] block font-mono">Revised Words</span>
              <span className="text-base font-bold font-mono text-[#7DD3FC] mt-0.5 block">{wordsB.toLocaleString()}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#151923] border border-[#282D3A] text-xs">
              <span className="text-[#9CA3AF] block font-mono">Net Word Difference</span>
              <span className={`text-base font-bold font-mono mt-0.5 block ${wordDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {wordDiff >= 0 ? `+${wordDiff}` : wordDiff} words
              </span>
            </div>
          </div>

          {/* Side by side diff viewer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Doc A */}
            <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Document A Clauses (Lines removed in B marked red):
              </span>
              <div className="max-h-96 overflow-y-auto space-y-1.5 p-2 bg-[#0B0D12] rounded-lg text-[11px] font-mono leading-relaxed">
                {linesA.map((line, i) => {
                  const isRemoved = !setB.has(line);
                  return (
                    <div
                      key={i}
                      className={`p-1 rounded ${
                        isRemoved
                          ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                          : 'text-slate-300'
                      }`}
                    >
                      {isRemoved && <span className="font-bold mr-1 text-rose-400">-</span>}
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Doc B */}
            <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Document B Clauses (Lines added in B marked green):
              </span>
              <div className="max-h-96 overflow-y-auto space-y-1.5 p-2 bg-[#0B0D12] rounded-lg text-[11px] font-mono leading-relaxed">
                {linesB.map((line, i) => {
                  const isAdded = !setA.has(line);
                  return (
                    <div
                      key={i}
                      className={`p-1 rounded ${
                        isAdded
                          ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                          : 'text-slate-300'
                      }`}
                    >
                      {isAdded && <span className="font-bold mr-1 text-emerald-400">+</span>}
                      {line}
                    </div>
                  );
                })}
              </div>
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
    </div>
  );
};
