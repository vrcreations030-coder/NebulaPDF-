import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import type { ExtractedPageText, PDFMetadataInfo } from '../types';

// Ensure PDF.js worker is properly configured for Vite & production bundles
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Safely duplicate an ArrayBuffer so consumers/workers never mutate or detach the original
 */
export function cloneBuffer(buf: ArrayBuffer): ArrayBuffer {
  if (!buf || buf.byteLength === 0) {
    throw new Error('PDF document buffer is detached or empty.');
  }
  return buf.slice(0);
}

/**
 * Ensure a fresh, non-detached buffer is available from a file or existing buffer
 */
export async function ensureFreshBuffer(item: { file: File; buffer: ArrayBuffer }): Promise<ArrayBuffer> {
  if (item.buffer && item.buffer.byteLength > 0) {
    return item.buffer.slice(0);
  }
  if (item.file) {
    const fresh = await item.file.arrayBuffer();
    item.buffer = fresh;
    return fresh.slice(0);
  }
  throw new Error('PDF document buffer is detached and cannot be recovered.');
}

/**
 * Load PDF with PDF.js safely using an independent cloned buffer
 */
export async function loadPdfJsDoc(buffer: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  const safeCopy = cloneBuffer(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(safeCopy),
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

/**
 * Load PDF with pdf-lib safely using an independent cloned buffer with friendly error handling
 */
export async function loadPdfLibDoc(
  buffer: ArrayBuffer,
  options: { ignoreEncryption?: boolean } = { ignoreEncryption: true }
): Promise<PDFDocument> {
  const safeCopy = cloneBuffer(buffer);
  try {
    return await PDFDocument.load(safeCopy, options);
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('password') || msg.includes('encrypted')) {
      throw new Error('This PDF is encrypted or password-protected. Please provide an unencrypted document.');
    }
    if (msg.includes('corrupt') || err?.name === 'CorruptPDFException') {
      throw new Error('This PDF file appears to be corrupted or contains an invalid structure.');
    }
    throw new Error(err?.message || 'Failed to read PDF document.');
  }
}

/**
 * Render a single PDF page to a canvas
 */
export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.5,
  rotation = 0
): Promise<void> {
  const page = await pdfDoc.getPage(pageNumber);
  const totalRotation = (page.rotate + rotation) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas,
  };
  await (page.render(renderContext as any) as any).promise;
}

/**
 * Render page directly to Image Data URL (PNG or JPEG) with optional rotation
 */
export async function renderPageToDataUrl(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.5,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.92,
  rotation = 0
): Promise<string> {
  const canvas = document.createElement('canvas');
  await renderPageToCanvas(pdfDoc, pageNumber, canvas, scale, rotation);
  return canvas.toDataURL(format, quality);
}

/**
 * Extract selectable text with page numbers
 */
export async function extractAllText(buffer: ArrayBuffer): Promise<ExtractedPageText[]> {
  const pdfDoc = await loadPdfJsDoc(buffer);
  const totalPages = pdfDoc.numPages;
  const results: ExtractedPageText[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    results.push({
      pageNumber: i,
      text: pageText,
    });
  }

  return results;
}

/**
 * Merge multiple PDF buffers in specified sequence
 */
export async function mergePdfs(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  if (buffers.length === 0) throw new Error('No PDF files provided to merge');
  const mergedPdf = await PDFDocument.create();

  for (const buf of buffers) {
    const pdf = await loadPdfLibDoc(buf);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Split PDF by ranges: e.g. [{ start: 1, end: 3 }, { start: 4, end: 5 }]
 */
export async function splitPdf(
  buffer: ArrayBuffer,
  ranges: { start: number; end: number }[]
): Promise<Uint8Array[]> {
  const srcPdf = await loadPdfLibDoc(buffer);
  const totalPages = srcPdf.getPageCount();
  if (totalPages === 0) {
    throw new Error('This PDF contains no readable pages.');
  }

  if (ranges.length === 0) {
    throw new Error('No page ranges specified for splitting.');
  }

  // Validate all ranges before processing
  for (const r of ranges) {
    if (r.start < 1 || r.end < 1) {
      throw new Error(`Invalid page range "${r.start}-${r.end}". Page numbers must be 1 or greater.`);
    }
    if (r.start > r.end) {
      throw new Error(`Invalid range "${r.start}-${r.end}". Start page cannot exceed end page.`);
    }
    if (r.start > totalPages) {
      throw new Error(`Page ${r.start} exceeds total document pages (${totalPages}).`);
    }
  }

  const resultPdfs: Uint8Array[] = [];

  for (const range of ranges) {
    const start = Math.max(1, Math.min(range.start, totalPages));
    const end = Math.max(start, Math.min(range.end, totalPages));
    const pageIndices: number[] = [];
    for (let i = start - 1; i < end; i++) {
      pageIndices.push(i);
    }

    const subDoc = await PDFDocument.create();
    const copiedPages = await subDoc.copyPages(srcPdf, pageIndices);
    copiedPages.forEach((p) => subDoc.addPage(p));
    resultPdfs.push(await subDoc.save());
  }

  return resultPdfs;
}

/**
 * Extract specific pages (1-indexed) into a new PDF
 */
export async function extractPages(buffer: ArrayBuffer, pageNumbers: number[]): Promise<Uint8Array> {
  const srcPdf = await loadPdfLibDoc(buffer);
  const totalPages = srcPdf.getPageCount();
  const validIndices = pageNumbers
    .filter((n) => n >= 1 && n <= totalPages)
    .map((n) => n - 1);

  if (validIndices.length === 0) {
    throw new Error('No valid pages selected for extraction.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcPdf, validIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

/**
 * Delete specified pages (1-indexed) and return remaining document
 */
export async function deletePages(buffer: ArrayBuffer, pagesToDelete: number[]): Promise<Uint8Array> {
  const srcPdf = await loadPdfLibDoc(buffer);
  const totalPages = srcPdf.getPageCount();
  const toDeleteSet = new Set(pagesToDelete);

  const remainingIndices: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (!toDeleteSet.has(i)) {
      remainingIndices.push(i - 1);
    }
  }

  if (remainingIndices.length === 0) {
    throw new Error('Cannot delete all pages from the document.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcPdf, remainingIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

/**
 * Reorder pages according to an array of 1-indexed page numbers
 */
export async function reorderPages(buffer: ArrayBuffer, newOrder: number[]): Promise<Uint8Array> {
  const srcPdf = await loadPdfLibDoc(buffer);
  const totalPages = srcPdf.getPageCount();

  const validIndices = newOrder
    .filter((n) => n >= 1 && n <= totalPages)
    .map((n) => n - 1);

  if (validIndices.length === 0) {
    throw new Error('Invalid page reordering order specified.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcPdf, validIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

/**
 * Rotate specific pages or all pages by angle (90, 180, 270)
 */
export async function rotatePdf(
  buffer: ArrayBuffer,
  rotations: Record<number, number>
): Promise<Uint8Array> {
  const pdfDoc = await loadPdfLibDoc(buffer);
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const additionalRotation = rotations[pageNum] || 0;
    if (additionalRotation !== 0) {
      const currentRotation = pages[i].getRotation().angle;
      const finalRotation = (currentRotation + additionalRotation) % 360;
      pages[i].setRotation(degrees(finalRotation));
    }
  }

  return await pdfDoc.save();
}

/**
 * Convert images (PNG, JPEG, WebP) to a formatted PDF
 */
export async function imagesToPdf(
  images: { dataUrl: string; width: number; height: number; filename?: string }[],
  options: {
    orientation?: 'portrait' | 'landscape' | 'auto';
    margin?: number;
    pageSize?: 'A4' | 'Letter' | 'FitImage';
  } = {}
): Promise<Uint8Array> {
  if (images.length === 0) throw new Error('No images provided to convert');
  const pdfDoc = await PDFDocument.create();
  const margin = options.margin ?? 20;

  for (const imgItem of images) {
    let embeddedImg;
    const isPng = imgItem.dataUrl.startsWith('data:image/png');

    const base64Data = imgItem.dataUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    if (isPng) {
      embeddedImg = await pdfDoc.embedPng(bytes);
    } else {
      embeddedImg = await pdfDoc.embedJpg(bytes);
    }

    let pageWidth = 595.28; // Standard A4 points
    let pageHeight = 841.89;

    if (options.pageSize === 'Letter') {
      pageWidth = 612;
      pageHeight = 792;
    } else if (options.pageSize === 'FitImage') {
      pageWidth = embeddedImg.width + margin * 2;
      pageHeight = embeddedImg.height + margin * 2;
    } else if (options.orientation === 'landscape' || (options.orientation === 'auto' && embeddedImg.width > embeddedImg.height)) {
      pageWidth = 841.89;
      pageHeight = 595.28;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - margin * 2;

    const scale = Math.min(availWidth / embeddedImg.width, availHeight / embeddedImg.height);
    const drawWidth = embeddedImg.width * scale;
    const drawHeight = embeddedImg.height * scale;

    const x = margin + (availWidth - drawWidth) / 2;
    const y = margin + (availHeight - drawHeight) / 2;

    page.drawImage(embeddedImg, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Add Text Watermark to all pages
 */
export async function addWatermark(
  buffer: ArrayBuffer,
  options: {
    text: string;
    fontSize?: number;
    opacity?: number;
    rotationAngle?: number;
    position?: 'center' | 'diagonal' | 'top' | 'bottom';
    color?: { r: number; g: number; b: number };
  }
): Promise<Uint8Array> {
  const pdfDoc = await loadPdfLibDoc(buffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const text = options.text.trim() || 'CONFIDENTIAL';
  const fontSize = options.fontSize || 48;
  const opacity = options.opacity !== undefined ? options.opacity : 0.35;
  const rotation = options.rotationAngle !== undefined ? options.rotationAngle : 45;
  const color = options.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0.55, 0.36, 0.96);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let x = (width - textWidth) / 2;
    let y = (height - textHeight) / 2;

    if (options.position === 'top') {
      y = height - 100;
    } else if (options.position === 'bottom') {
      y = 60;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color,
      opacity,
      rotate: degrees(rotation),
    });
  }

  return await pdfDoc.save();
}

/**
 * Add Page Numbers to document
 */
export async function addPageNumbers(
  buffer: ArrayBuffer,
  options: {
    position?: 'bottom-center' | 'bottom-right' | 'top-right' | 'bottom-left';
    format?: 'Page X of Y' | 'X / Y' | 'X' | '- X -';
    startFrom?: number;
    fontSize?: number;
  } = {}
): Promise<Uint8Array> {
  const pdfDoc = await loadPdfLibDoc(buffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  const startFrom = options.startFrom || 1;
  const fontSize = options.fontSize || 10;
  const format = options.format || 'Page X of Y';
  const position = options.position || 'bottom-center';

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const currentNum = startFrom + i;

    let text = `Page ${currentNum} of ${total}`;
    if (format === 'X / Y') text = `${currentNum} / ${total}`;
    if (format === 'X') text = `${currentNum}`;
    if (format === '- X -') text = `— ${currentNum} —`;

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const margin = 30;

    let x = (width - textWidth) / 2;
    let y = margin;

    if (position === 'bottom-right') {
      x = width - textWidth - margin;
      y = margin;
    } else if (position === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (position === 'top-right') {
      x = width - textWidth - margin;
      y = height - margin - fontSize;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.3, 0.35, 0.45),
    });
  }

  return await pdfDoc.save();
}

/**
 * Perform honest client-side PDF optimization / compression
 */
export async function compressPdf(
  buffer: ArrayBuffer,
  qualityFactor = 0.75
): Promise<{ data: Uint8Array; originalSize: number; newSize: number; ratioPercent: number }> {
  const originalSize = buffer.byteLength;
  const pdfDoc = await loadPdfLibDoc(buffer);

  const optimizedData = await pdfDoc.save({
    useObjectStreams: true,
  });

  const newSize = optimizedData.byteLength;
  const ratioPercent = Math.round(((originalSize - newSize) / originalSize) * 100);

  return {
    data: optimizedData,
    originalSize,
    newSize,
    ratioPercent,
  };
}

/**
 * Inspect document metadata and health metrics
 */
export async function inspectPdf(buffer: ArrayBuffer): Promise<PDFMetadataInfo> {
  const pdfDoc = await loadPdfLibDoc(buffer);
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;
  const fileSize = buffer.byteLength;

  let formFieldsCount = 0;
  let hasForms = false;
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    formFieldsCount = fields.length;
    hasForms = formFieldsCount > 0;
  } catch {
    hasForms = false;
  }

  const pageDimensions = pages.slice(0, 10).map((p) => {
    const size = p.getSize();
    return {
      width: Math.round(size.width),
      height: Math.round(size.height),
      unit: 'pt',
    };
  });

  return {
    title: pdfDoc.getTitle() || undefined,
    author: pdfDoc.getAuthor() || undefined,
    subject: pdfDoc.getSubject() || undefined,
    creator: pdfDoc.getCreator() || undefined,
    producer: pdfDoc.getProducer() || undefined,
    creationDate: pdfDoc.getCreationDate()?.toLocaleString() || undefined,
    modificationDate: pdfDoc.getModificationDate()?.toLocaleString() || undefined,
    pageCount,
    fileSize,
    hasForms,
    formFieldsCount,
    pageDimensions,
  };
}

/**
 * Create a Document Pack with a clean, branded Cover Page
 */
export async function createDocumentPack(
  buffers: ArrayBuffer[],
  coverOptions?: {
    title: string;
    subtitle?: string;
    author?: string;
    date?: string;
  }
): Promise<Uint8Array> {
  const masterDoc = await PDFDocument.create();

  if (coverOptions && coverOptions.title) {
    const fontTitle = await masterDoc.embedFont(StandardFonts.HelveticaBold);
    const fontBody = await masterDoc.embedFont(StandardFonts.Helvetica);
    const coverPage = masterDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = coverPage.getSize();

    coverPage.drawRectangle({
      x: 0,
      y: height - 240,
      width,
      height: 240,
      color: rgb(0.043, 0.051, 0.07),
    });

    coverPage.drawRectangle({
      x: 50,
      y: height - 240,
      width: width - 100,
      height: 3,
      color: rgb(0.545, 0.36, 0.965),
    });

    coverPage.drawText('NEBULAPDF DOCUMENT PACK', {
      x: 50,
      y: height - 80,
      size: 11,
      font: fontTitle,
      color: rgb(0.49, 0.827, 0.988),
    });

    coverPage.drawText(coverOptions.title, {
      x: 50,
      y: height - 125,
      size: 26,
      font: fontTitle,
      color: rgb(1, 1, 1),
    });

    if (coverOptions.subtitle) {
      coverPage.drawText(coverOptions.subtitle, {
        x: 50,
        y: height - 165,
        size: 14,
        font: fontBody,
        color: rgb(0.7, 0.74, 0.82),
      });
    }

    const dateStr = coverOptions.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    coverPage.drawText(`Generated on: ${dateStr}`, {
      x: 50,
      y: 100,
      size: 10,
      font: fontBody,
      color: rgb(0.5, 0.55, 0.65),
    });

    if (coverOptions.author) {
      coverPage.drawText(`Prepared by: ${coverOptions.author}`, {
        x: 50,
        y: 80,
        size: 10,
        font: fontBody,
        color: rgb(0.5, 0.55, 0.65),
      });
    }

    coverPage.drawText(`Contains ${buffers.length} merged documents`, {
      x: 50,
      y: 60,
      size: 10,
      font: fontBody,
      color: rgb(0.5, 0.55, 0.65),
    });
  }

  for (const buf of buffers) {
    const doc = await loadPdfLibDoc(buf);
    const copiedPages = await masterDoc.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((p) => masterDoc.addPage(p));
  }

  return await masterDoc.save();
}

/**
 * Detect interactive form fields
 */
export async function detectFormFields(
  buffer: ArrayBuffer
): Promise<{ name: string; type: string; value?: string }[]> {
  try {
    const pdfDoc = await loadPdfLibDoc(buffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    return fields.map((field) => {
      const name = field.getName();
      const typeName = field.constructor.name || 'FormField';
      let value = '';
      try {
        if ('getText' in field && typeof (field as any).getText === 'function') {
          value = (field as any).getText() || '';
        } else if ('isChecked' in field && typeof (field as any).isChecked === 'function') {
          value = (field as any).isChecked() ? 'Checked' : 'Unchecked';
        } else if ('getSelected' in field && typeof (field as any).getSelected === 'function') {
          value = String((field as any).getSelected() || '');
        }
      } catch {
        value = '';
      }

      return {
        name,
        type: typeName.replace('PDF', '').replace('Field', ''),
        value: value || undefined,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Burn annotations (text, highlights, freehand rects) onto a PDF
 */
export async function burnAnnotations(
  buffer: ArrayBuffer,
  annotations: Array<{
    pageNumber: number;
    type: 'text' | 'highlight' | 'rectangle';
    text?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
  }>
): Promise<Uint8Array> {
  const pdfDoc = await loadPdfLibDoc(buffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const annot of annotations) {
    const pageIndex = annot.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    const pdfX = (annot.x / 100) * width;
    const pdfY = height - (annot.y / 100) * height;

    if (annot.type === 'text' && annot.text) {
      page.drawText(annot.text, {
        x: pdfX,
        y: pdfY - 14,
        size: 14,
        font,
        color: rgb(0.9, 0.1, 0.1),
      });
    } else if (annot.type === 'highlight') {
      const boxW = ((annot.width || 20) / 100) * width;
      const boxH = ((annot.height || 4) / 100) * height;
      page.drawRectangle({
        x: pdfX,
        y: pdfY - boxH,
        width: boxW,
        height: boxH,
        color: rgb(1, 0.95, 0.2),
        opacity: 0.45,
      });
    } else if (annot.type === 'rectangle') {
      const boxW = ((annot.width || 20) / 100) * width;
      const boxH = ((annot.height || 10) / 100) * height;
      page.drawRectangle({
        x: pdfX,
        y: pdfY - boxH,
        width: boxW,
        height: boxH,
        borderColor: rgb(0.55, 0.36, 0.96),
        borderWidth: 2,
        opacity: 0.8,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Helper to download any binary array as a file in browser
 */
export function downloadBlob(data: Uint8Array | Blob, filename: string, mimeType = 'application/pdf'): void {
  const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
