import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import {
  performBrowserOCR,
  SUPPORTED_OCR_LANGUAGES,
  getOcrLanguageMeta,
  rotateImageDataUrl,
  type OCRProgressEvent,
} from '../services/ocrService';
import { loadPdfJsDoc, renderPageToDataUrl, downloadBlob } from '../services/pdfEngine';
import {
  ScanText,
  ArrowLeft,
  Download,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  HardDrive,
  Globe2,
  Search,
  Sparkles,
  AlignRight,
  AlignLeft,
  FileText,
  CheckCircle2,
  RotateCw,
  RotateCcw,
  RefreshCw,
  HelpCircle,
  Layers,
} from 'lucide-react';

interface OcrToolViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
}

export const OcrToolView: React.FC<OcrToolViewProps> = ({ onBack, sharedFiles }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('hin'); // Default to Hindi (हिन्दी)
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [textDirection, setTextDirection] = useState<'ltr' | 'rtl' | 'auto'>('auto');
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270

  const [selectedSource, setSelectedSource] = useState<{
    type: 'pdf' | 'image';
    name: string;
    buffer?: ArrayBuffer;
    dataUrl?: string;
    pageCount?: number;
    previewUrl?: string;
  } | null>(null);

  const [activePdfPage, setActivePdfPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgressEvent | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [recognizedLang, setRecognizedLang] = useState<string>('');
  const [hasDevanagariDetected, setHasDevanagariDetected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentLangMeta = getOcrLanguageMeta(selectedLanguage);

  // Automatically adjust text direction when language changes if set to auto
  const effectiveDirection =
    textDirection === 'auto'
      ? currentLangMeta.isRtl
        ? 'rtl'
        : 'ltr'
      : textDirection;

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setExtractedText('');
    setConfidence(null);
    setRotation(0);
    const f = files[0];

    try {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setSelectedSource({
            type: 'image',
            name: f.name,
            dataUrl,
            previewUrl: dataUrl,
          });
        };
        reader.readAsDataURL(f);
      } else {
        const buffer = await f.arrayBuffer();
        const doc = await loadPdfJsDoc(buffer);
        // Render first page preview at 1x
        const previewUrl = await renderPageToDataUrl(doc, 1, 1.0, 'image/jpeg', 0.9, 0);
        setSelectedSource({
          type: 'pdf',
          name: f.name,
          buffer,
          pageCount: doc.numPages,
          previewUrl,
        });
        setActivePdfPage(1);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to read document or image.');
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (!selectedSource || selectedSource.type !== 'pdf' || !selectedSource.buffer) return;
    setActivePdfPage(newPage);
    try {
      const doc = await loadPdfJsDoc(selectedSource.buffer);
      const previewUrl = await renderPageToDataUrl(doc, newPage, 1.0, 'image/jpeg', 0.9, rotation);
      setSelectedSource((prev) => (prev ? { ...prev, previewUrl } : null));
    } catch (err: any) {
      console.warn('Page preview failed:', err);
    }
  };

  const handleRotate = async (delta: number) => {
    const nextRot = (rotation + delta + 360) % 360;
    setRotation(nextRot);

    if (!selectedSource) return;

    if (selectedSource.type === 'pdf' && selectedSource.buffer) {
      try {
        const doc = await loadPdfJsDoc(selectedSource.buffer);
        const previewUrl = await renderPageToDataUrl(doc, activePdfPage, 1.0, 'image/jpeg', 0.9, nextRot);
        setSelectedSource((prev) => (prev ? { ...prev, previewUrl } : null));
      } catch (e) {
        console.warn('Failed to rotate PDF preview', e);
      }
    } else if (selectedSource.type === 'image' && selectedSource.dataUrl) {
      try {
        const rotatedUrl = await rotateImageDataUrl(selectedSource.dataUrl, nextRot);
        setSelectedSource((prev) => (prev ? { ...prev, previewUrl: rotatedUrl } : null));
      } catch (e) {
        console.warn('Failed to rotate image preview', e);
      }
    }
  };

  const executeOcr = async () => {
    if (!selectedSource) return;
    setError(null);
    setIsProcessing(true);
    setProgress({ status: 'Preparing raster image for OCR...', progress: 5, phase: 'init' });

    try {
      let imageSource: string;

      if (selectedSource.type === 'image' && selectedSource.dataUrl) {
        if (rotation !== 0) {
          setProgress({ status: `Applying ${rotation}° rotation correction...`, progress: 8, phase: 'init' });
          imageSource = await rotateImageDataUrl(selectedSource.dataUrl, rotation);
        } else {
          imageSource = selectedSource.dataUrl;
        }
      } else if (selectedSource.type === 'pdf' && selectedSource.buffer) {
        setProgress({
          status: `Rasterizing page ${activePdfPage} at high resolution (2x DPI)...`,
          progress: 10,
          phase: 'init',
        });
        const doc = await loadPdfJsDoc(selectedSource.buffer);
        // Render at scale 2.0 with rotation to ensure Indic diacritics, conjuncts, and matras are crisp
        imageSource = await renderPageToDataUrl(doc, activePdfPage, 2.0, 'image/png', 1.0, rotation);
      } else {
        throw new Error('No valid source image found.');
      }

      const res = await performBrowserOCR(imageSource, selectedLanguage, (p) => {
        setProgress(p);
      });

      if (!res.text.trim()) {
        setError(
          `No legible ${currentLangMeta.name} text could be recognized. The document may be low contrast, blurry, or oriented sideways. Try adjusting page rotation or switching to bilingual mode.`
        );
      } else {
        setExtractedText(res.text);
        setConfidence(res.confidence);
        setRecognizedLang(res.language);
        setHasDevanagariDetected(res.hasDevanagari);
      }
    } catch (err: any) {
      setError(err?.message || 'OCR processing failed.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!extractedText) return;
    const baseName = selectedSource?.name.replace(/\.[^/.]+$/, '') || 'extracted_text';
    const langSuffix = currentLangMeta.code.replace('+', '_');
    const pageSuffix = selectedSource?.type === 'pdf' ? `_p${activePdfPage}` : '';
    // Blob with explicit UTF-8 charset preserves all Indic & Arabic multi-byte code points
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${baseName}_ocr_${langSuffix}${pageSuffix}.txt`, 'text/plain;charset=utf-8');
  };

  const filteredLanguages = SUPPORTED_OCR_LANGUAGES.filter((l) => {
    const q = langSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      l.script.toLowerCase().includes(q)
    );
  });

  const wordCount = extractedText ? extractedText.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = extractedText ? extractedText.length : 0;

  // Check if Hindi was selected but no Devanagari was found
  const isHindiSelected = selectedLanguage === 'hin' || selectedLanguage === 'hin+eng';
  const showDevanagariWarning =
    extractedText && isHindiSelected && !hasDevanagariDetected && charCount > 10;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tools</span>
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
          <ScanText className="w-4 h-4" />
          <span>Multilingual Optical Character Recognition</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Browser OCR Reader — Indian Languages & English
        </h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-3xl leading-relaxed">
          Extract text from scanned PDFs, photos, and book pages with high-fidelity Unicode support.
          Featuring dedicated neural models for <strong className="text-white">Hindi (हिन्दी)</strong>,{' '}
          <strong className="text-white">Hindi + English bilingual (हिन्दी + अंग्रेज़ी)</strong>,{' '}
          <strong className="text-white">English (अंग्रेज़ी)</strong>, and 10 regional Indian languages.
        </p>
      </div>

      {/* Architectural Guarantee Card */}
      <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] space-y-2.5 text-xs text-[#9CA3AF]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#7DD3FC] font-semibold">
            <HardDrive className="w-4 h-4" />
            <span>Privacy-Preserving On-Device OCR Execution</span>
          </div>
          <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
            100% Client-Side • Zero Cloud File Transmission
          </span>
        </div>
        <p className="leading-relaxed">
          Models download dynamically on demand and are cached in your browser’s IndexedDB for offline reuse.
          Documents are processed entirely in your browser sandbox using WebAssembly.
        </p>
      </div>

      {/* Upload Zone or Active Document Workspace */}
      {!selectedSource ? (
        <DropZone
          accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,image/tiff"
          onFilesSelected={handleFileUpload}
          title="Upload Scanned PDF or Image"
          description="Supports scanned Hindi/English PDFs, receipts, books, PNG, JPEG, and WebP images."
        />
      ) : (
        <div className="space-y-6">
          {/* Document Header & Controls */}
          <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#0B0D12] border border-[#282D3A] flex items-center justify-center text-[#8B5CF6] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                  {selectedSource.name}
                </p>
                <p className="text-[#9CA3AF] font-mono text-[11px]">
                  {selectedSource.type === 'pdf'
                    ? `PDF Document • ${selectedSource.pageCount} page${(selectedSource.pageCount || 1) > 1 ? 's' : ''}`
                    : 'Image File (Raster Scan)'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* PDF Page Selector */}
              {selectedSource.type === 'pdf' && selectedSource.pageCount && selectedSource.pageCount > 1 && (
                <div className="flex items-center gap-2 bg-[#0B0D12] border border-[#282D3A] px-3 py-1.5 rounded-lg">
                  <span className="text-[#9CA3AF]">Scan Page:</span>
                  <select
                    value={activePdfPage}
                    onChange={(e) => handlePageChange(Number(e.target.value))}
                    className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: selectedSource.pageCount }).map((_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#151923] text-white">
                        Page {i + 1} of {selectedSource.pageCount}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rotation Correction Controls */}
              <div className="flex items-center bg-[#0B0D12] border border-[#282D3A] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handleRotate(-90)}
                  title="Rotate Counter-Clockwise (-90°)"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-[#151923] rounded transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[11px] font-mono text-slate-300">
                  {rotation}°
                </span>
                <button
                  type="button"
                  onClick={() => handleRotate(90)}
                  title="Rotate Clockwise (+90°)"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-[#151923] rounded transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedSource(null);
                  setExtractedText('');
                  setConfidence(null);
                  setError(null);
                  setRotation(0);
                }}
                className="px-3 py-1.5 text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg transition-colors cursor-pointer"
              >
                Change File
              </button>
            </div>
          </div>

          {/* Language Selector Section */}
          <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Select Target Language & Script</span>
                </label>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  Choose the primary language of your document. For mixed Hindi-English documents, choose bilingual mode.
                </p>
              </div>

              {/* Quick search input */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Filter languages..."
                  value={langSearchQuery}
                  onChange={(e) => setLangSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>

            {/* Quick Primary Shortcuts: Hindi, Hindi+English, English */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-[#9CA3AF] font-medium mr-1">Frequent:</span>
              <button
                type="button"
                onClick={() => setSelectedLanguage('hin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedLanguage === 'hin'
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'bg-[#0B0D12] text-slate-300 border-[#282D3A] hover:border-slate-500'
                }`}
              >
                <span>Hindi (हिन्दी)</span>
                <span className="text-[10px] opacity-75 font-mono">hin</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLanguage('hin+eng')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedLanguage === 'hin+eng'
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'bg-[#0B0D12] text-slate-300 border-[#282D3A] hover:border-slate-500'
                }`}
              >
                <Layers className="w-3 h-3 text-[#7DD3FC]" />
                <span>Hindi + English (हिन्दी + अंग्रेज़ी)</span>
                <span className="text-[10px] opacity-75 font-mono">bilingual</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLanguage('eng')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedLanguage === 'eng'
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'bg-[#0B0D12] text-slate-300 border-[#282D3A] hover:border-slate-500'
                }`}
              >
                <span>English (अंग्रेज़ी)</span>
                <span className="text-[10px] opacity-75 font-mono">eng</span>
              </button>
            </div>

            {/* Language Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
              {filteredLanguages.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] shadow-sm shadow-[#8B5CF6]/20 ring-1 ring-[#8B5CF6]'
                        : 'bg-[#0B0D12] border-[#282D3A] hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-[#7DD3FC]">
                          {lang.code}
                        </span>
                        {lang.isRtl && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                            RTL
                          </span>
                        )}
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#8B5CF6]" />}
                      </div>
                      <p className="text-xs font-semibold text-white leading-tight">{lang.name}</p>
                      <p className="text-xs text-[#8B5CF6] font-medium leading-tight">
                        {lang.nativeName}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-[#282D3A]/60 flex items-center justify-between text-[10px] text-[#9CA3AF]">
                      <span>{lang.script}</span>
                      <span>~{lang.sizeMb}MB</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Language Status & OCR Action Button */}
            <div className="pt-3 border-t border-[#282D3A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#9CA3AF]">Target Model:</span>
                <span className="px-2.5 py-1 rounded bg-[#0B0D12] border border-[#282D3A] text-white font-medium flex items-center gap-1.5">
                  <span className="text-[#8B5CF6] font-semibold">{currentLangMeta.name}</span>
                  <span className="text-slate-400">({currentLangMeta.nativeName})</span>
                  <span className="text-[10px] font-mono text-[#7DD3FC]">• {currentLangMeta.code}</span>
                  {currentLangMeta.isRtl && (
                    <span className="text-[10px] text-amber-400 font-mono">(Right-to-Left)</span>
                  )}
                </span>
                {rotation !== 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] font-mono">
                    Rotation: {rotation}°
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {extractedText && (
                  <button
                    onClick={executeOcr}
                    disabled={isProcessing}
                    className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] hover:border-slate-500 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry OCR</span>
                  </button>
                )}

                <button
                  onClick={executeOcr}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-40 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Scan...</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="w-4 h-4" />
                      <span>Start Browser OCR</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Progress Bar */}
            {isProcessing && progress && (
              <div className="pt-3 border-t border-[#282D3A] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">{progress.status}</span>
                  <span className="text-[#8B5CF6] font-bold">{progress.progress}%</span>
                </div>
                <div className="w-full h-2 bg-[#0B0D12] rounded-full overflow-hidden border border-[#282D3A]">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#7DD3FC] transition-all duration-300"
                    style={{ width: `${Math.max(8, progress.progress)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#9CA3AF]">
                  {progress.phase === 'download'
                    ? 'Initial download in progress. Trained model is cached in browser storage for instant future recognition.'
                    : 'Running optical neural character decoding and language script segmentation.'}
                </p>
              </div>
            )}
          </div>

          {/* Document Preview and OCR Result Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Document Page Preview */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Source Preview</span>
                <div className="flex items-center gap-2 text-[#9CA3AF] text-[11px]">
                  <span>{selectedSource.type === 'pdf' ? `Page ${activePdfPage}` : 'Image Scan'}</span>
                  {rotation !== 0 && <span className="font-mono text-amber-400">({rotation}°)</span>}
                </div>
              </div>
              <div className="bg-[#0B0D12] border border-[#282D3A] rounded-xl p-2 min-h-64 flex items-center justify-center overflow-hidden">
                {selectedSource.previewUrl ? (
                  <img
                    src={selectedSource.previewUrl}
                    alt="Document preview"
                    className="max-h-80 w-auto object-contain rounded shadow transition-transform duration-200"
                  />
                ) : (
                  <p className="text-xs text-slate-500">Preview rendering...</p>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <span>Orientation Correction:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRotate(-90)}
                    className="px-2 py-0.5 rounded bg-[#0B0D12] border border-[#282D3A] hover:text-white cursor-pointer"
                  >
                    -90°
                  </button>
                  <button
                    onClick={() => handleRotate(90)}
                    className="px-2 py-0.5 rounded bg-[#0B0D12] border border-[#282D3A] hover:text-white cursor-pointer"
                  >
                    +90°
                  </button>
                  <button
                    onClick={() => handleRotate(180)}
                    className="px-2 py-0.5 rounded bg-[#0B0D12] border border-[#282D3A] hover:text-white cursor-pointer"
                  >
                    180°
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Extracted Text Workspace */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Extracted Text</span>
                    {confidence !== null && (
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                          confidence >= 75
                            ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                            : confidence >= 50
                            ? 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                            : 'text-rose-400 bg-rose-950/40 border-rose-800/40'
                        }`}
                      >
                        Confidence: {Math.round(confidence)}%
                      </span>
                    )}
                  </div>

                  {extractedText && (
                    <div className="flex items-center gap-2">
                      {/* RTL / LTR text direction toggle */}
                      <div className="flex items-center bg-[#0B0D12] border border-[#282D3A] rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setTextDirection('ltr')}
                          title="Left-to-Right"
                          className={`px-2 py-1 text-[11px] rounded flex items-center gap-1 cursor-pointer ${
                            effectiveDirection === 'ltr'
                              ? 'bg-[#8B5CF6] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <AlignLeft className="w-3 h-3" />
                          <span>LTR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTextDirection('rtl')}
                          title="Right-to-Left (Urdu)"
                          className={`px-2 py-1 text-[11px] rounded flex items-center gap-1 cursor-pointer ${
                            effectiveDirection === 'rtl'
                              ? 'bg-[#8B5CF6] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <AlignRight className="w-3 h-3" />
                          <span>RTL</span>
                        </button>
                      </div>

                      <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0D12] border border-[#282D3A] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={handleDownloadTxt}
                        className="px-3 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white flex items-center gap-1.5 cursor-pointer font-semibold shadow-sm transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download TXT</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Validation Notice Banner when Devanagari is detected */}
                {extractedText && isHindiSelected && hasDevanagariDetected && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>
                      Valid Devanagari Unicode characters (U+0900–U+097F) recognized with UTF-8 encoding preserved.
                    </span>
                  </div>
                )}

                {/* Warning Banner if Hindi was selected but no Devanagari was found */}
                {showDevanagariWarning && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Notice: No Devanagari script characters were detected</p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        If your document is upside down or tilted, click the <strong className="text-white">+90°</strong> or <strong className="text-white">180°</strong> rotation buttons on the preview and click <strong className="text-white">Retry OCR</strong>. For mixed Hindi-English text, select <strong className="text-white">Hindi + English (हिन्दी + अंग्रेज़ी)</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Text View Area */}
                {extractedText ? (
                  <div
                    dir={effectiveDirection}
                    className={`p-4 bg-[#0B0D12] border border-[#282D3A] rounded-xl text-sm leading-relaxed min-h-64 max-h-96 overflow-y-auto select-text font-sans text-slate-100 whitespace-pre-wrap ${
                      effectiveDirection === 'rtl' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {extractedText}
                  </div>
                ) : (
                  <div className="p-8 bg-[#0B0D12] border border-[#282D3A] rounded-xl min-h-64 flex flex-col items-center justify-center text-center space-y-2 text-[#9CA3AF]">
                    <Sparkles className="w-8 h-8 text-[#8B5CF6]/60" />
                    <p className="text-sm font-medium text-slate-300">No text extracted yet</p>
                    <p className="text-xs max-w-sm">
                      Select your document language ({currentLangMeta.name}) and click{' '}
                      <span className="text-white font-semibold">Start Browser OCR</span> to begin recognition.
                    </p>
                  </div>
                )}
              </div>

              {/* Status footer with counts */}
              {extractedText && (
                <div className="pt-3 border-t border-[#282D3A] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#9CA3AF] font-mono">
                  <div className="flex items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{charCount} characters (UTF-8)</span>
                    <span>•</span>
                    <span>Script: {currentLangMeta.script}</span>
                  </div>
                  <span className="text-emerald-400">Unicode Preserved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner with Retry button */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
          <button
            onClick={executeOcr}
            disabled={isProcessing}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800/80 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-medium shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
};
