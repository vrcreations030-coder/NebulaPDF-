import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { detectFormFields, loadPdfJsDoc, downloadBlob, ensureFreshBuffer } from '../services/pdfEngine';
import {
  CheckSquare,
  ArrowLeft,
  Download,
  AlertCircle,
  FileText,
  Info,
} from 'lucide-react';

interface FormHelperViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
}

export const FormHelperView: React.FC<FormHelperViewProps> = ({ onBack, sharedFiles }) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [fields, setFields] = useState<{ name: string; type: string; value?: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentFile) {
      setIsScanning(true);
      setError(null);
      ensureFreshBuffer(currentFile)
        .then((buf) => detectFormFields(buf))
        .then((fList) => {
          setFields(fList);
          setHasScanned(true);
        })
        .catch((err) => setError(err?.message || 'Field scan failed'))
        .finally(() => setIsScanning(false));
    } else {
      setFields([]);
      setHasScanned(false);
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
      setError(err?.message || 'Failed to read PDF');
    }
  };

  const exportFieldsJson = () => {
    if (!currentFile || fields.length === 0) return;
    const jsonStr = JSON.stringify(fields, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, `${currentFile.file.name.replace(/\.pdf$/i, '')}_form_fields.json`, 'application/json');
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
          <CheckSquare className="w-4 h-4" />
          <span>Interactive AcroForm Scanner</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">PDF Form Helper</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Detect and audit interactive form inputs, checkboxes, and data dictionaries inside fillable PDFs.
        </p>
      </div>

      <div className="p-3.5 rounded-xl bg-[#151923] border border-[#282D3A] flex items-start gap-3 text-xs text-[#9CA3AF]">
        <Info className="w-4 h-4 shrink-0 text-[#7DD3FC] mt-0.5" />
        <span>
          <strong>Form Integrity Note:</strong> Scans real standard AcroForm fields embedded in the PDF dictionary. If a document only contains flat visual underlined text (without PDF interactive form tags), no fake fields will be invented.
        </span>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to inspect form fields"
          description="Analyzes AcroForm dictionaries in browser memory."
        />
      ) : (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] flex items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-sm font-semibold text-white">{currentFile.file.name}</p>
              <p className="text-[#9CA3AF] font-mono">
                {fields.length} interactive fields detected · {currentFile.pageCount} pages
              </p>
            </div>
            <button
              onClick={() => setCurrentFile(null)}
              className="px-3 py-1.5 text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg cursor-pointer"
            >
              Change File
            </button>
          </div>

          {hasScanned && (
            <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#282D3A]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#8B5CF6]" />
                  Detected Field Inventory ({fields.length})
                </h3>

                {fields.length > 0 && (
                  <button
                    onClick={exportFieldsJson}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Schema JSON</span>
                  </button>
                )}
              </div>

              {fields.length > 0 ? (
                <div className="divide-y divide-[#282D3A]/60 text-xs">
                  {fields.map((field, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-mono text-white font-medium block">{field.name}</span>
                        <span className="text-[11px] font-mono text-[#7DD3FC]">Type: {field.type}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        Value: {field.value || '(empty)'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#9CA3AF] space-y-1">
                  <p className="text-white font-medium">No interactive AcroForm fields found in this document.</p>
                  <p>This is a standard flat or scanned PDF without interactive form widgets.</p>
                </div>
              )}
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
