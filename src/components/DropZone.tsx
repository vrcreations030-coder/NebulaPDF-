import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle, RefreshCw } from 'lucide-react';

export interface UploadedPDFFile {
  file: File;
  buffer: ArrayBuffer;
  pageCount?: number;
}

interface DropZoneProps {
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  selectedFiles?: UploadedPDFFile[];
  onRemoveFile?: (index: number) => void;
  onClearAll?: () => void;
  title?: string;
  description?: string;
  maxSizeMB?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  accept = '.pdf,application/pdf',
  multiple = false,
  onFilesSelected,
  selectedFiles = [],
  onRemoveFile,
  onClearAll,
  title = 'Choose or drop your document',
  description = 'Processed entirely locally on your device. Never uploaded to an external server.',
  maxSizeMB = 100,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFiles = (files: FileList | File[]) => {
    setWarning(null);
    const validFiles: File[] = [];
    const maxBytes = maxSizeMB * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxBytes) {
        setWarning(`"${file.name}" exceeds ${maxSizeMB}MB. Browser memory might experience slowdown.`);
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
      />

      {/* Drop Target Box */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 scale-[0.99]'
            : 'border-[#282D3A] bg-[#151923] hover:border-[#8B5CF6]/60 hover:bg-[#171329]/60'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-[#171329] border border-[#282D3A] flex items-center justify-center text-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.12)]">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-xs text-[#9CA3AF] mt-1 max-w-md mx-auto">{description}</p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-semibold rounded-lg shadow-sm">
              <UploadCloud className="w-4 h-4" />
              Choose {multiple ? 'Files' : 'File'}
            </span>
          </div>
        </div>
      </div>

      {warning && (
        <div className="flex items-center gap-2 p-3 text-xs bg-amber-950/40 border border-amber-800/60 text-amber-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{warning}</span>
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] px-1">
            <span>
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} loaded in browser memory
            </span>
            {onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Reset files
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {selectedFiles.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#151923] border border-[#282D3A] text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  <FileText className="w-4 h-4 text-[#7DD3FC] shrink-0" />
                  <span className="text-slate-200 font-medium truncate">{item.file.name}</span>
                  <span className="text-[#9CA3AF] shrink-0 font-mono text-[11px]">
                    ({formatBytes(item.file.size)})
                  </span>
                  {item.pageCount !== undefined && (
                    <span className="text-[11px] text-[#8B5CF6] shrink-0 font-mono">
                      · {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                    </span>
                  )}
                </div>

                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(idx);
                    }}
                    className="p-1 text-[#9CA3AF] hover:text-rose-400 rounded transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
