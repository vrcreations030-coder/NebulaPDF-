import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { createDocumentPack, downloadBlob, loadPdfJsDoc, ensureFreshBuffer } from '../services/pdfEngine';
import {
  FolderArchive,
  ArrowLeft,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
} from 'lucide-react';

interface DocumentPackViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
}

export const DocumentPackView: React.FC<DocumentPackViewProps> = ({ onBack, sharedFiles }) => {
  const [files, setFiles] = useState<UploadedPDFFile[]>(sharedFiles);
  const [packTitle, setPackTitle] = useState('Comprehensive Document Dossier');
  const [packSubtitle, setPackSubtitle] = useState('Prepared with NebulaPDF Local Toolkit');
  const [authorName, setAuthorName] = useState('');
  const [isAssembling, setIsAssembling] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (newFiles: File[]) => {
    const added: UploadedPDFFile[] = [];
    for (const f of newFiles) {
      try {
        const buffer = await f.arrayBuffer();
        const doc = await loadPdfJsDoc(buffer);
        added.push({ file: f, buffer, pageCount: doc.numPages });
      } catch {}
    }
    setFiles((prev) => [...prev, ...added]);
  };

  const handleAssemble = async () => {
    if (files.length === 0) {
      setError('Please upload at least one document to include in the pack.');
      return;
    }
    setError(null);
    setIsAssembling(true);
    setResultBytes(null);

    try {
      const buffers = await Promise.all(files.map((f) => ensureFreshBuffer(f)));
      const output = await createDocumentPack(buffers, {
        title: packTitle,
        subtitle: packSubtitle,
        author: authorName || undefined,
      });
      setResultBytes(output);
    } catch (err: any) {
      setError(err?.message || 'Failed to assemble Document Pack');
    } finally {
      setIsAssembling(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes) return;
    downloadBlob(resultBytes, 'nebula_document_pack.pdf');
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
          <FolderArchive className="w-4 h-4" />
          <span>Dossier Assembler</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Document Pack & Cover Sheet</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Compile multiple standalone PDFs into an executive presentation dossier featuring an automatically styled cover page.
        </p>
      </div>

      <DropZone
        multiple
        onFilesSelected={handleFiles}
        title="Select Documents for the Pack"
        description="Add reports, spreadsheets, and invoices to merge."
      />

      {files.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-5">
          <h3 className="text-sm font-bold text-white">Cover Page Metadata</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-[#9CA3AF] block mb-1">Dossier Main Title:</label>
              <input
                type="text"
                value={packTitle}
                onChange={(e) => setPackTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0D12] border border-[#282D3A] rounded-xl text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">Subtitle / Context:</label>
              <input
                type="text"
                value={packSubtitle}
                onChange={(e) => setPackSubtitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">Author / Organization:</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Legal & Compliance Division"
                className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Included Documents Summary */}
          <div className="pt-2 border-t border-[#282D3A] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
              <span>Documents included ({files.length}):</span>
              <button onClick={() => setFiles([])} className="text-rose-400 hover:text-rose-300 cursor-pointer">
                Clear
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {files.map((item, idx) => (
                <div key={idx} className="p-2 rounded bg-[#0B0D12] text-xs flex justify-between text-slate-300">
                  <span className="truncate">{idx + 1}. {item.file.name}</span>
                  <span className="font-mono text-[#7DD3FC] text-[11px]">{item.pageCount} pages</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleAssemble}
              disabled={isAssembling || files.length === 0}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] disabled:opacity-40 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isAssembling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Cover & Merging...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4" />
                  <span>Generate Document Pack</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {resultBytes && (
        <div className="p-5 rounded-2xl bg-[#171329] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Document Pack Created!</h3>
              <p className="text-xs text-[#9CA3AF]">
                Generated {Math.round(resultBytes.byteLength / 1024)} KB dossier with branded cover page.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <Download className="w-4 h-4" />
            <span>Download Document Pack</span>
          </button>
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
