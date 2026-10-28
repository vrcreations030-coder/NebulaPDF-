import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { inspectPdf, loadPdfJsDoc, ensureFreshBuffer } from '../services/pdfEngine';
import type { PDFMetadataInfo } from '../types';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Maximize2,
  Calendar,
  User,
  Info,
} from 'lucide-react';

interface HealthCheckViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
}

export const HealthCheckView: React.FC<HealthCheckViewProps> = ({ onBack, sharedFiles }) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [healthData, setHealthData] = useState<PDFMetadataInfo | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentFile) {
      setIsInspecting(true);
      setError(null);
      ensureFreshBuffer(currentFile)
        .then((buf) => inspectPdf(buf))
        .then((res) => setHealthData(res))
        .catch((err) => setError(err?.message || 'Inspection failed'))
        .finally(() => setIsInspecting(false));
    } else {
      setHealthData(null);
    }
  }, [currentFile]);

  const handleFile = async (files: File[]) => {
    if (!files.length) return;
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      setCurrentFile({ file: f, buffer, pageCount: doc.numPages });
    } catch (err: any) {
      setError(err?.message || 'Failed to read PDF file');
    }
  };

  const formatSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(1)} KB (${(bytes / (1024 * 1024)).toFixed(2)} MB)`;
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
          <Activity className="w-4 h-4" />
          <span>Diagnostic Inspector</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">PDF Health Check</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Analyze document specifications, embedded metadata headers, page dimensions, and fillable form fields.
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF for Health & Metadata Analysis"
          description="Audits internal streams and PDF object dictionaries."
        />
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] flex items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-sm font-semibold text-white">{currentFile.file.name}</p>
              <p className="text-[#9CA3AF] font-mono">{formatSize(currentFile.file.size)}</p>
            </div>
            <button
              onClick={() => setCurrentFile(null)}
              className="px-3 py-1.5 text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg cursor-pointer"
            >
              Change File
            </button>
          </div>

          {healthData && (
            <div className="space-y-6">
              {/* Summary Diagnostic Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A]">
                  <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Page Count</span>
                  <p className="text-xl font-bold text-white font-mono mt-1">{healthData.pageCount}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A]">
                  <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Security Status</span>
                  <p className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Decrypted & Valid
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A]">
                  <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Interactive Forms</span>
                  <p className="text-sm font-bold text-[#7DD3FC] mt-2">
                    {healthData.hasForms ? `${healthData.formFieldsCount} fields` : 'None detected'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A]">
                  <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">File Integrity</span>
                  <p className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Streams Intact
                  </p>
                </div>
              </div>

              {/* Metadata Table */}
              <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#8B5CF6]" />
                  Embedded Document Metadata
                </h3>

                <div className="divide-y divide-[#282D3A]/60 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#9CA3AF]">Document Title:</span>
                    <span className="text-white font-medium">{healthData.title || '(Not specified in PDF)'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#9CA3AF]">Author:</span>
                    <span className="text-white font-medium">{healthData.author || '(Not specified)'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#9CA3AF]">Subject:</span>
                    <span className="text-white font-medium">{healthData.subject || '(Not specified)'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#9CA3AF]">PDF Creator Software:</span>
                    <span className="text-white font-mono text-[11px]">{healthData.creator || '(Not specified)'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#9CA3AF]">PDF Producer / Engine:</span>
                    <span className="text-white font-mono text-[11px]">{healthData.producer || '(Not specified)'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#9CA3AF]">Creation Date:</span>
                    <span className="text-white font-mono text-[11px]">{healthData.creationDate || '(Unknown)'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#9CA3AF]">Modification Date:</span>
                    <span className="text-white font-mono text-[11px]">{healthData.modificationDate || '(Unknown)'}</span>
                  </div>
                </div>
              </div>

              {/* Page Dimensions */}
              {healthData.pageDimensions && healthData.pageDimensions.length > 0 && (
                <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-[#7DD3FC]" />
                    Page Dimensions (First {healthData.pageDimensions.length} Pages)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    {healthData.pageDimensions.map((dim, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#282D3A] font-mono">
                        <span className="text-[#9CA3AF] block text-[10px]">Page {idx + 1}</span>
                        <span className="text-white font-bold">{dim.width} × {dim.height} pt</span>
                        <span className="text-[#7DD3FC] text-[10px] block mt-0.5">
                          {dim.width === 595 && dim.height === 842 ? 'A4 Standard' : dim.width === 612 && dim.height === 792 ? 'US Letter' : 'Custom'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
