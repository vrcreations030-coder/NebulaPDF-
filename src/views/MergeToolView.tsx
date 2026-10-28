import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { mergePdfs, downloadBlob, loadPdfJsDoc, ensureFreshBuffer } from '../services/pdfEngine';
import type { ToolId } from '../types';
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface MergeToolViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
  onRemoveSharedFile: (index: number) => void;
}

export const MergeToolView: React.FC<MergeToolViewProps> = ({
  onBack,
  sharedFiles,
  onAddSharedFiles,
  onRemoveSharedFile,
}) => {
  const [files, setFiles] = useState<UploadedPDFFile[]>(sharedFiles);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mergedBlob, setMergedBlob] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState('nebula_merged.pdf');

  // Sync when sharedFiles change if local files is empty
  React.useEffect(() => {
    if (files.length === 0 && sharedFiles.length > 0) {
      setFiles(sharedFiles);
    }
  }, [sharedFiles]);

  const handleFilesAdded = async (newFiles: File[]) => {
    setError(null);
    setSuccess(false);
    const added: UploadedPDFFile[] = [];

    for (const f of newFiles) {
      try {
        const buffer = await f.arrayBuffer();
        let pageCount: number | undefined = undefined;
        try {
          const doc = await loadPdfJsDoc(buffer);
          pageCount = doc.numPages;
        } catch {
          // non-fatal
        }
        added.push({ file: f, buffer, pageCount });
      } catch (e: any) {
        setError(`Failed reading ${f.name}: ${e.message}`);
      }
    }

    const updated = [...files, ...added];
    setFiles(updated);
    onAddSharedFiles(added);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const newFiles = [...files];
    const [moved] = newFiles.splice(index, 1);
    newFiles.splice(targetIndex, 0, moved);
    setFiles(newFiles);
  };

  const removeItem = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onRemoveSharedFile(index);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }
    setError(null);
    setIsProcessing(true);
    setSuccess(false);

    try {
      const buffers = await Promise.all(files.map((f) => ensureFreshBuffer(f)));
      const mergedBytes = await mergePdfs(buffers);
      setMergedBlob(mergedBytes);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to merge PDF files.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!mergedBlob) return;
    downloadBlob(mergedBlob, outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tools</span>
        </button>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
          <Layers className="w-4 h-4" />
          <span>Document Combiner</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Merge PDF Files</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Combine multiple PDF files into one clean document. Reorder files in the exact sequence you desire.
        </p>
      </div>

      {/* Upload Zone */}
      <DropZone
        multiple={true}
        onFilesSelected={handleFilesAdded}
        title="Add PDF files to merge"
        description="Select multiple documents. Reorder them below before combining."
      />

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Files List with Ordering Controls */}
      {files.length > 0 && (
        <div className="space-y-3 p-5 rounded-2xl bg-[#151923] border border-[#282D3A]">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
            <span className="font-medium text-white">Files to Merge ({files.length})</span>
            <span>Drag or use arrows to adjust sequence</span>
          </div>

          <div className="space-y-2">
            {files.map((item, index) => (
              <div
                key={`${item.file.name}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0B0D12] border border-[#282D3A] text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <span className="w-6 h-6 rounded-md bg-[#171329] border border-[#282D3A] flex items-center justify-center font-mono font-bold text-[#8B5CF6] text-[11px] shrink-0">
                    {index + 1}
                  </span>
                  <div className="truncate">
                    <p className="text-white font-medium truncate">{item.file.name}</p>
                    <p className="text-[#9CA3AF] text-[11px] font-mono">
                      {Math.round(item.file.size / 1024)} KB
                      {item.pageCount ? ` · ${item.pageCount} pages` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30 rounded hover:bg-[#151923] cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === files.length - 1}
                    className="p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30 rounded hover:bg-[#151923] cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1.5 text-[#9CA3AF] hover:text-rose-400 rounded hover:bg-[#151923] cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Merge Settings & Actions */}
          <div className="pt-4 border-t border-[#282D3A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#9CA3AF] whitespace-nowrap">Output filename:</label>
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="px-3 py-1.5 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <button
              onClick={handleMerge}
              disabled={isProcessing || files.length < 2}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-40 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Merging {files.length} PDFs...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Merge {files.length} Files</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success & Download Banner */}
      {success && mergedBlob && (
        <div className="p-5 rounded-2xl bg-[#171329] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Merge Completed Successfully!</h3>
              <p className="text-xs text-[#9CA3AF]">
                Generated {Math.round(mergedBlob.byteLength / 1024)} KB document ready for instant download.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <Download className="w-4 h-4" />
            <span>Download Merged PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
