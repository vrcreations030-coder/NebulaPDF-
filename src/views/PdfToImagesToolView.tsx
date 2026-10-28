import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { loadPdfJsDoc, renderPageToDataUrl, downloadBlob } from '../services/pdfEngine';
import JSZip from 'jszip';
import {
  FileImage,
  ArrowLeft,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Archive,
} from 'lucide-react';

interface PdfToImagesToolViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

interface RenderedImage {
  pageNumber: number;
  dataUrl: string;
}

export const PdfToImagesToolView: React.FC<PdfToImagesToolViewProps> = ({
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [scale, setScale] = useState<number>(1.5);
  const [renderedImages, setRenderedImages] = useState<RenderedImage[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setRenderedImages([]);
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      const uploaded: UploadedPDFFile = { file: f, buffer, pageCount: doc.numPages };
      setCurrentFile(uploaded);
      onAddSharedFiles([uploaded]);
    } catch (err: any) {
      setError(err?.message || 'Failed to read PDF document');
    }
  };

  const handleConvert = async () => {
    if (!currentFile) return;
    setError(null);
    setIsRendering(true);
    setRenderedImages([]);

    try {
      const doc = await loadPdfJsDoc(currentFile.buffer);
      const total = doc.numPages;
      const images: RenderedImage[] = [];

      for (let i = 1; i <= total; i++) {
        setRenderProgress({ current: i, total });
        const dataUrl = await renderPageToDataUrl(doc, i, scale, format, 0.92);
        images.push({ pageNumber: i, dataUrl });
      }

      setRenderedImages(images);
    } catch (err: any) {
      setError(err?.message || 'Failed to convert PDF pages to images');
    } finally {
      setIsRendering(false);
      setRenderProgress(null);
    }
  };

  const handleDownloadSingle = (image: RenderedImage) => {
    if (!currentFile) return;
    const baseName = currentFile.file.name.replace(/\.pdf$/i, '');
    const ext = format === 'image/png' ? 'png' : 'jpg';
    const a = document.createElement('a');
    a.href = image.dataUrl;
    a.download = `${baseName}_page_${image.pageNumber}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadZip = async () => {
    if (!currentFile || renderedImages.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const baseName = currentFile.file.name.replace(/\.pdf$/i, '');
      const ext = format === 'image/png' ? 'png' : 'jpg';

      for (const item of renderedImages) {
        const base64 = item.dataUrl.split(',')[1];
        zip.file(`${baseName}_page_${item.pageNumber}.${ext}`, base64, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${baseName}_images.zip`, 'application/zip');
    } catch (err: any) {
      setError(`Failed to create ZIP: ${err?.message}`);
    } finally {
      setIsZipping(false);
    }
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
          <FileImage className="w-4 h-4" />
          <span>Image Rasterizer</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Convert PDF to JPG / PNG</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Render high-fidelity page images directly inside your browser. Download single images or batch archive ZIP.
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to convert to images"
          description="High-resolution rendering with PDF.js"
        />
      ) : (
        <div className="space-y-6">
          {/* File bar & options */}
          <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
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
                  setRenderedImages([]);
                }}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg transition-colors cursor-pointer"
              >
                Change PDF
              </button>
            </div>

            {/* Resolution & Format settings */}
            <div className="pt-3 border-t border-[#282D3A] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Image Format:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('image/png')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      format === 'image/png'
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#0B0D12] text-[#9CA3AF] border-[#282D3A]'
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('image/jpeg')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      format === 'image/jpeg'
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#0B0D12] text-[#9CA3AF] border-[#282D3A]'
                    }`}
                  >
                    JPG (Compact)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Render Resolution:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScale(1.0)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      scale === 1.0
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#0B0D12] text-[#9CA3AF] border-[#282D3A]'
                    }`}
                  >
                    1.0x (Standard 100 DPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScale(1.75)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      scale === 1.75
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#0B0D12] text-[#9CA3AF] border-[#282D3A]'
                    }`}
                  >
                    1.75x (High-Res 175 DPI)
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#282D3A] flex justify-end">
              <button
                onClick={handleConvert}
                disabled={isRendering}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-40 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Rendering page {renderProgress?.current} of {renderProgress?.total}...
                    </span>
                  </>
                ) : (
                  <>
                    <FileImage className="w-4 h-4" />
                    <span>Convert {currentFile.pageCount} Pages to Images</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Rendered Images Display */}
          {renderedImages.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-medium text-white">
                  Rendered {renderedImages.length} Image{renderedImages.length > 1 ? 's' : ''}
                </span>

                <button
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isZipping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating ZIP Archive...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      <span>Download All as ZIP</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto p-1">
                {renderedImages.map((img) => (
                  <div
                    key={img.pageNumber}
                    className="p-3 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-2 flex flex-col justify-between"
                  >
                    <span className="text-[11px] font-mono text-[#9CA3AF]">Page {img.pageNumber}</span>
                    <div className="aspect-[3/4] bg-[#151923] rounded-lg overflow-hidden flex items-center justify-center border border-[#282D3A]/50">
                      <img
                        src={img.dataUrl}
                        alt={`Rendered Page ${img.pageNumber}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => handleDownloadSingle(img)}
                      className="w-full py-1.5 text-[11px] font-medium text-slate-200 hover:text-white bg-[#151923] hover:bg-[#282D3A] rounded border border-[#282D3A] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Download className="w-3 h-3 text-[#7DD3FC]" />
                      <span>Save Image</span>
                    </button>
                  </div>
                ))}
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
