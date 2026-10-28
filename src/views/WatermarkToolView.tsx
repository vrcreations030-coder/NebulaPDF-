import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { addWatermark, downloadBlob, loadPdfJsDoc, ensureFreshBuffer } from '../services/pdfEngine';
import {
  Stamp,
  ArrowLeft,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface WatermarkToolViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

export const WatermarkToolView: React.FC<WatermarkToolViewProps> = ({
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<'center' | 'diagonal' | 'top' | 'bottom'>('diagonal');
  const [colorPreset, setColorPreset] = useState<'violet' | 'red' | 'gray' | 'blue'>('violet');
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

  const getColorRgb = () => {
    switch (colorPreset) {
      case 'red': return { r: 0.9, g: 0.15, b: 0.15 };
      case 'blue': return { r: 0.1, g: 0.5, b: 0.9 };
      case 'gray': return { r: 0.45, g: 0.45, b: 0.45 };
      case 'violet':
      default:
        return { r: 0.55, g: 0.36, b: 0.96 };
    }
  };

  const handleApply = async () => {
    if (!currentFile) return;
    setError(null);
    setIsProcessing(true);
    setResultBlob(null);

    try {
      const safeBuf = await ensureFreshBuffer(currentFile);
      const bytes = await addWatermark(safeBuf, {
        text: watermarkText,
        fontSize,
        opacity,
        rotationAngle: rotation,
        position,
        color: getColorRgb(),
      });
      setResultBlob(bytes);
    } catch (err: any) {
      setError(err?.message || 'Failed to stamp watermark.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !currentFile) return;
    const baseName = currentFile.file.name.replace(/\.pdf$/i, '');
    downloadBlob(resultBlob, `${baseName}_watermarked.pdf`);
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
          <Stamp className="w-4 h-4" />
          <span>Security & Status Stamp</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Watermark PDF</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Apply custom text stamps, security notices, and status overlays with fine-grained opacity and rotation.
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to add watermark"
          description="Renders custom vector watermarks across all document pages."
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

            {/* Watermark Configuration Form */}
            <div className="pt-3 border-t border-[#282D3A] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-[#9CA3AF] block mb-1">Watermark Text:</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. CONFIDENTIAL, DRAFT, INTERNAL USE ONLY"
                  className="w-full px-3.5 py-2.5 bg-[#0B0D12] border border-[#282D3A] rounded-xl text-xs text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Position & Angle:</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={position}
                    onChange={(e) => {
                      const pos = e.target.value as any;
                      setPosition(pos);
                      if (pos === 'diagonal') setRotation(45);
                      else setRotation(0);
                    }}
                    className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="diagonal">Diagonal (Center 45°)</option>
                    <option value="center">Center (Horizontal)</option>
                    <option value="top">Top Header</option>
                    <option value="bottom">Bottom Footer</option>
                  </select>

                  <select
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value={45}>45° Angle</option>
                    <option value={-45}>-45° Angle</option>
                    <option value={0}>0° Horizontal</option>
                    <option value={90}>90° Vertical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Color Palette:</label>
                <div className="flex items-center gap-2">
                  {(['violet', 'red', 'blue', 'gray'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorPreset(color)}
                      className={`flex-1 py-1.5 text-xs capitalize rounded-lg border transition-colors cursor-pointer ${
                        colorPreset === color
                          ? 'border-[#8B5CF6] text-white bg-[#171329]'
                          : 'border-[#282D3A] text-[#9CA3AF] bg-[#0B0D12]'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Font Size: ({fontSize}pt)</label>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Opacity: ({Math.round(opacity * 100)}%)</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#8B5CF6]"
                />
              </div>
            </div>

            {/* Live Watermark Preview Mockup Box */}
            <div className="p-6 rounded-xl bg-[#0B0D12] border border-[#282D3A] text-center relative overflow-hidden h-28 flex items-center justify-center select-none">
              <span className="text-xs text-slate-500 absolute top-2 left-3">Page Preview Simulation</span>
              <span
                style={{
                  fontSize: `${Math.round(fontSize * 0.45)}px`,
                  opacity,
                  transform: `rotate(${rotation}deg)`,
                  color:
                    colorPreset === 'red'
                      ? '#ef4444'
                      : colorPreset === 'blue'
                      ? '#38bdf8'
                      : colorPreset === 'gray'
                      ? '#9ca3af'
                      : '#8b5cf6',
                }}
                className="font-extrabold uppercase tracking-widest font-sans transition-all"
              >
                {watermarkText || 'WATERMARK'}
              </span>
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
                    <span>Applying Watermark...</span>
                  </>
                ) : (
                  <>
                    <Stamp className="w-4 h-4" />
                    <span>Apply Watermark to All Pages</span>
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
                  <h3 className="text-sm font-bold text-white">Watermark Stamped Successfully!</h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Ready to download with verified vector transparency.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <Download className="w-4 h-4" />
                <span>Download Watermarked PDF</span>
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
