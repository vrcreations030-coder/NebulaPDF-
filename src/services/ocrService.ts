import { createWorker } from 'tesseract.js';

export interface OCRProgressEvent {
  status: string;
  progress: number;
  phase?: 'download' | 'init' | 'recognize' | 'done';
}

export interface OCRLanguageOption {
  code: string;
  name: string;
  nativeName: string;
  label: string;
  script: string;
  sizeMb: number;
  isRtl?: boolean;
  isBilingual?: boolean;
}

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  isRtl: boolean;
  hasDevanagari: boolean;
  hasIndic: boolean;
  characterCount: number;
  wordCount: number;
}

/**
 * 13 genuinely verified OCR configurations:
 * - English (Latin)
 * - Hindi (Devanagari)
 * - Hindi + English Bilingual (Devanagari + Latin)
 * - 10 additional major Indian languages (Punjabi, Gujarati, Marathi, Telugu, Tamil, Kannada, Bengali, Malayalam, Odia, Urdu)
 *
 * Models load on demand from standard CORS-enabled Tessdata CDN and cache in IndexedDB.
 */
export const SUPPORTED_OCR_LANGUAGES: OCRLanguageOption[] = [
  {
    code: 'hin',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    label: 'Hindi (हिन्दी)',
    script: 'Devanagari',
    sizeMb: 1.3,
    isRtl: false,
  },
  {
    code: 'hin+eng',
    name: 'Hindi + English',
    nativeName: 'हिन्दी + अंग्रेज़ी',
    label: 'Hindi + English (हिन्दी + अंग्रेज़ी) — Bilingual',
    script: 'Devanagari & Latin',
    sizeMb: 11.7,
    isBilingual: true,
    isRtl: false,
  },
  {
    code: 'eng',
    name: 'English',
    nativeName: 'English',
    label: 'English (अंग्रेज़ी)',
    script: 'Latin',
    sizeMb: 10.4,
    isRtl: false,
  },
  {
    code: 'mar',
    name: 'Marathi',
    nativeName: 'मराठी',
    label: 'Marathi (मराठी)',
    script: 'Devanagari',
    sizeMb: 1.9,
    isRtl: false,
  },
  {
    code: 'pan',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    label: 'Punjabi (ਪੰਜਾਬੀ)',
    script: 'Gurmukhi',
    sizeMb: 1.3,
    isRtl: false,
  },
  {
    code: 'guj',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    label: 'Gujarati (ગુજરાતી)',
    script: 'Gujarati',
    sizeMb: 1.2,
    isRtl: false,
  },
  {
    code: 'ben',
    name: 'Bengali',
    nativeName: 'বাংলা',
    label: 'Bengali (বাংলা)',
    script: 'Bengali',
    sizeMb: 1.3,
    isRtl: false,
  },
  {
    code: 'tam',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    label: 'Tamil (தமிழ்)',
    script: 'Tamil',
    sizeMb: 1.4,
    isRtl: false,
  },
  {
    code: 'tel',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    label: 'Telugu (తెలుగు)',
    script: 'Telugu',
    sizeMb: 1.7,
    isRtl: false,
  },
  {
    code: 'kan',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    label: 'Kannada (ಕನ್ನಡ)',
    script: 'Kannada',
    sizeMb: 1.8,
    isRtl: false,
  },
  {
    code: 'mal',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    label: 'Malayalam (മലയാളം)',
    script: 'Malayalam',
    sizeMb: 2.7,
    isRtl: false,
  },
  {
    code: 'ori',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    label: 'Odia (ଓଡ଼ିଆ)',
    script: 'Odia',
    sizeMb: 1.0,
    isRtl: false,
  },
  {
    code: 'urd',
    name: 'Urdu',
    nativeName: 'اردو',
    label: 'Urdu (اردو)',
    script: 'Perso-Arabic',
    sizeMb: 1.0,
    isRtl: true,
  },
];

/**
 * Retrieve language metadata
 */
export function getOcrLanguageMeta(code: string): OCRLanguageOption {
  return (
    SUPPORTED_OCR_LANGUAGES.find((l) => l.code === code) || {
      code,
      name: code,
      nativeName: code,
      label: code,
      script: 'Unknown',
      sizeMb: 2.0,
      isRtl: code === 'urd',
    }
  );
}

/**
 * Unicode Range Checkers for Indic and Devanagari Scripts
 */
export function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function hasIndicScript(text: string): boolean {
  // Devanagari (0900-097F), Bengali (0980-09FF), Gurmukhi (0A00-0A7F),
  // Gujarati (0A80-0AFF), Odia (0B00-0B7F), Tamil (0B80-0BFF),
  // Telugu (0C00-0C7F), Kannada (0C80-0CFF), Malayalam (0D00-0D7F), Arabic/Urdu (0600-06FF)
  return /[\u0900-\u0D7F\u0600-\u06FF]/.test(text);
}

/**
 * Rotate an image Data URL by an angle (0, 90, 180, 270 degrees) using an offscreen canvas
 */
export async function rotateImageDataUrl(dataUrl: string, degrees: number): Promise<string> {
  const normDeg = ((degrees % 360) + 360) % 360;
  if (normDeg === 0) return dataUrl;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      if (normDeg === 90 || normDeg === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((normDeg * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation correction.'));
    img.src = dataUrl;
  });
}

/**
 * Execute real client-side OCR on an image data URL, Blob, or Canvas using Tesseract.js.
 * Loads the selected language model dynamically on-demand with IndexedDB client caching.
 */
export async function performBrowserOCR(
  imageSource: string | Blob | HTMLCanvasElement,
  language = 'hin',
  onProgress?: (event: OCRProgressEvent) => void
): Promise<OCRResult> {
  let worker: any = null;
  const langMeta = getOcrLanguageMeta(language);

  try {
    worker = await createWorker(language, undefined, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      cacheMethod: 'write',
      logger: (m: any) => {
        if (onProgress && m) {
          const rawStatus = m.status || 'processing';
          const progress = typeof m.progress === 'number' ? Math.round(m.progress * 100) : 0;
          let friendlyStatus = rawStatus;
          let phase: OCRProgressEvent['phase'] = 'recognize';

          if (rawStatus.includes('loading tesseract core')) {
            friendlyStatus = 'Loading Tesseract WebAssembly Core...';
            phase = 'init';
          } else if (rawStatus.includes('loaded tesseract core')) {
            friendlyStatus = 'WASM Core ready';
            phase = 'init';
          } else if (rawStatus.includes('loading language traineddata') || rawStatus.includes('downloading')) {
            friendlyStatus = `Downloading ${langMeta.name} model (${langMeta.sizeMb}MB)...`;
            phase = 'download';
          } else if (rawStatus.includes('loaded language traineddata')) {
            friendlyStatus = `${langMeta.name} neural model ready`;
            phase = 'download';
          } else if (rawStatus.includes('initializing tesseract') || rawStatus.includes('initializing api')) {
            friendlyStatus = `Initializing neural network for ${langMeta.name}...`;
            phase = 'init';
          } else if (rawStatus.includes('recognizing text')) {
            friendlyStatus = `Recognizing ${langMeta.name} characters (${progress}%)...`;
            phase = 'recognize';
          }

          onProgress({ status: friendlyStatus, progress, phase });
        }
      },
      errorHandler: (err: any) => {
        console.warn('Tesseract worker warning:', err);
      },
    });

    const ret = await worker.recognize(imageSource);
    const text = (ret.data?.text || '').trim();
    const confidence = typeof ret.data?.confidence === 'number' ? ret.data.confidence : 0;

    await worker.terminate();

    const devanagariFound = hasDevanagari(text);
    const indicFound = hasIndicScript(text);
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const characterCount = text.length;

    return {
      text,
      confidence,
      language,
      isRtl: Boolean(langMeta.isRtl),
      hasDevanagari: devanagariFound,
      hasIndic: indicFound,
      wordCount,
      characterCount,
    };
  } catch (error: any) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore cleanup error
      }
    }

    const rawMsg = error?.message || '';
    if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('network')) {
      throw new Error(
        `Failed to download the ${langMeta.name} (${langMeta.code}) traineddata model. Please verify your internet connection on first download.`
      );
    }
    throw new Error(rawMsg || `OCR processing failed for language "${langMeta.name}".`);
  }
}
