import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { compressPdf, downloadBlob, loadPdfJsDoc, ensureFreshBuffer } from '../services/pdfEngine';
import {
  Minimize2,
  ArrowLeft,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';

interface CompressToolViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

export const CompressToolView: React.FC<CompressToolViewProps> = ({
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionResult, setCompressionResult] = useState<{
    data: Uint8Array;
    originalSize: number;
    newSize: number;
    ratioPercent: number;
  } | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setCompressionResult(null);
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

  const handleCompress = async () => {
    if (!currentFile) return;
    setError(null);
    setIsCompressing(true);
    setCompressionResult(null);

    try {
      const safeBuf = await ensureFreshBuffer(currentFile);
      const res = await compressPdf(safeBuf);
      setCompressionResult(res);
    } catch (err: any) {
      setError(err?.message || 'Compression operation failed.');
    } finally {
      setIsCompressing(false);
    }
  };

  const formatSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleDownload = () => {
    if (!compressionResult || !currentFile) return;
    const baseName = currentFile.file.name.replace(/\.pdf$/i, '');
    downloadBlob(compressionResult.data, `${baseName}_optimized.pdf`);
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
          <Minimize2 className="w-4 h-4" />
          <span>Stream Optimizer</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Compress PDF</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Optimize document object streams and strip redundant metadata locally. Honest byte-for-byte reporting.
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to optimize file size"
          description="Local stream compaction without compromising page content."
        />
      ) : (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{currentFile.file.name}</p>
                <p className="text-xs text-[#9CA3AF] font-mono">
                  Original Size: <strong className="text-white">{formatSize(currentFile.file.size)}</strong> ({currentFile.pageCount} pages)
                </p>
              </div>

              <button
                onClick={() => {
                  setCurrentFile(null);
                  setCompressionResult(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg transition-colors cursor-pointer"
              >
                Change Document
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0D12] border border-[#282D3A] flex items-start gap-3 text-xs text-[#9CA3AF] leading-relaxed">
              <Info className="w-4 h-4 shrink-0 text-[#7DD3FC] mt-0.5" />
              <span>
                <strong>Honest Compression Disclosure:</strong> PDF documents that already contain highly compressed scanned images or vectorized text may see modest reductions or no change. We never artificially degrade text readability or downsample below baseline.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleCompress}
                disabled={isCompressing}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-40 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing & Re-packing Streams...</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Optimize PDF Streams</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Comparison */}
          {compressionResult && (
            <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-5">
              <h3 className="text-sm font-bold text-white">Compression Analysis Result</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A]">
                  <p className="text-[11px] font-mono text-[#9CA3AF] uppercase">Original Size</p>
                  <p className="text-xl font-bold font-mono text-white mt-1">
                    {formatSize(compressionResult.originalSize)}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A]">
                  <p className="text-[11px] font-mono text-[#9CA3AF] uppercase">Optimized Size</p>
                  <p className="text-xl font-bold font-mono text-[#7DD3FC] mt-1">
                    {formatSize(compressionResult.newSize)}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A]">
                  <p className="text-[11px] font-mono text-[#9CA3AF] uppercase">Efficiency Ratio</p>
                  <p className={`text-xl font-bold font-mono mt-1 ${compressionResult.ratioPercent > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {compressionResult.ratioPercent > 0 ? `-${compressionResult.ratioPercent}%` : 'Already Optimal'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#171329] border border-[#8B5CF6]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-300">
                  {compressionResult.ratioPercent > 0 ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Saved {(compressionResult.originalSize - compressionResult.newSize) / 1024 > 1 ? `${Math.round((compressionResult.originalSize - compressionResult.newSize) / 1024)} KB` : 'bytes'} while preserving document integrity.
                    </span>
                  ) : (
                    <span>This PDF is already tightly serialized. Object streams were inspected and verified.</span>
                  )}
                </div>

                <button
                  onClick={handleDownload}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Optimized PDF</span>
                </button>
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
    </div>
  );
};
