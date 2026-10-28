import React, { useState } from 'react';
import { imagesToPdf, downloadBlob } from '../services/pdfEngine';
import {
  Images,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadCloud,
} from 'lucide-react';

interface ImageItem {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  width: number;
  height: number;
}

interface ImagesToPdfToolViewProps {
  onBack: () => void;
}

export const ImagesToPdfToolView: React.FC<ImagesToPdfToolViewProps> = ({ onBack }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'FitImage'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [margin, setMargin] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState('nebula_images.pdf');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);
    setGeneratedPdf(null);
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setImages((prev) => [
            ...prev,
            {
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              name: file.name,
              size: file.size,
              dataUrl,
              width: img.naturalWidth || 800,
              height: img.naturalHeight || 600,
            },
          ]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);
    setImages(updated);
  };

  const removeImage = (index: number) => {
    const updated = [...images];
    updated.splice(index, 1);
    setImages(updated);
  };

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError('Please add at least one image.');
      return;
    }
    setError(null);
    setIsGenerating(true);
    setGeneratedPdf(null);

    try {
      const pdfBytes = await imagesToPdf(images, {
        pageSize,
        orientation,
        margin,
      });
      setGeneratedPdf(pdfBytes);
    } catch (err: any) {
      setError(err?.message || 'Failed to create PDF from images.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedPdf) return;
    downloadBlob(generatedPdf, outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`);
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
          <Images className="w-4 h-4" />
          <span>Image Synthesizer</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Convert Images to PDF</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Turn JPG, PNG, and WebP photos into a clean formatted PDF. Reorder pages and customize margins.
        </p>
      </div>

      {/* Upload Box */}
      <div className="p-8 border-2 border-dashed border-[#282D3A] hover:border-[#8B5CF6]/50 rounded-2xl bg-[#151923] text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#171329] border border-[#282D3A] text-[#8B5CF6] flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Choose Images to Convert</h3>
          <p className="text-xs text-[#9CA3AF]">Supports JPG, PNG, WebP photos and screenshots</p>
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          <span>Select Images</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Settings & Reordering */}
      {images.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-5">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
            <span className="font-semibold text-white">{images.length} Images Loaded</span>
            <button
              onClick={() => setImages([])}
              className="text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              Clear All
            </button>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#282D3A]">
            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">Page Size:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="A4">A4 Standard (210 × 297 mm)</option>
                <option value="Letter">US Letter (8.5 × 11 in)</option>
                <option value="FitImage">Fit to Image Geometry</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">Orientation:</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="auto">Auto (Match Image Ratio)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">Page Margins: ({margin}pt)</label>
              <input
                type="range"
                min="0"
                max="50"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full accent-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Images Grid */}
          <div className="space-y-2 pt-2 border-t border-[#282D3A]">
            <p className="text-[11px] text-[#9CA3AF]">Arrange image sequence:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="p-2 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-1.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>#{idx + 1}</span>
                    <span className="truncate max-w-[80px]">{img.name}</span>
                  </div>
                  <div className="aspect-square bg-[#151923] rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={img.dataUrl} alt={img.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => moveImage(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-[#9CA3AF] hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveImage(idx, 'down')}
                      disabled={idx === images.length - 1}
                      className="p-1 text-[#9CA3AF] hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeImage(idx)}
                      className="p-1 text-[#9CA3AF] hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#282D3A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#9CA3AF]">Filename:</label>
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="px-3 py-1.5 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || images.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-40 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing PDF...</span>
                </>
              ) : (
                <>
                  <Images className="w-4 h-4" />
                  <span>Generate PDF from {images.length} Images</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {generatedPdf && (
        <div className="p-5 rounded-2xl bg-[#171329] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">PDF Created Successfully!</h3>
              <p className="text-xs text-[#9CA3AF]">
                Generated {Math.round(generatedPdf.byteLength / 1024)} KB PDF document.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <Download className="w-4 h-4" />
            <span>Download Generated PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
