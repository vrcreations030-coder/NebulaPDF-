import type { AIAnalysisResult, ExtractedPageText } from '../types';

/**
 * State for AI configuration
 */
export type AIProviderStatus = 'Local Heuristic Mode' | 'Cloudflare Proxy Configured' | 'External Setup Required';

/**
 * Local privacy-preserving extractive summarizer
 * Scores sentences based on token frequency and position without external network calls
 */
export function generateLocalSummary(pages: ExtractedPageText[], maxSentences = 4): string {
  const fullText = pages.map((p) => p.text).join('\n\n').trim();
  if (!fullText) return 'No readable text could be extracted from this document.';

  const sentences = fullText
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 350);

  if (sentences.length <= maxSentences) {
    return sentences.join(' ');
  }

  // Calculate word frequencies (excluding stop words)
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'are', 'was',
    'not', 'but', 'can', 'all', 'any', 'which', 'their', 'has', 'will', 'been',
  ]);

  const wordCounts: Record<string, number> = {};
  const words = fullText.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  for (const w of words) {
    if (!stopWords.has(w)) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
  }

  // Score sentences
  const scored = sentences.map((sentence, index) => {
    const sWords = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    let score = 0;
    for (const sw of sWords) {
      if (wordCounts[sw]) score += wordCounts[sw];
    }
    // Slight bias for opening and concluding sections
    if (index === 0) score *= 1.3;
    if (index === 1) score *= 1.15;
    return { sentence, score, index };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxSentences).sort((a, b) => a.index - b.index);

  return selected.map((s) => s.sentence).join(' ');
}

/**
 * Local privacy-preserving entity and action item extractor
 * Uses verified deterministic regex patterns
 */
export function extractLocalEntities(pages: ExtractedPageText[]): {
  dates: string[];
  monetary: string[];
  names: string[];
  actionItems: string[];
} {
  const fullText = pages.map((p) => p.text).join('\n');

  // Dates: YYYY-MM-DD, MM/DD/YYYY, or Month DD, YYYY
  const dateRegex = /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/gi;
  const dates = Array.from(new Set(fullText.match(dateRegex) || [])).slice(0, 12);

  // Monetary values: $1,200.00, €450, £10,000, 500 USD, etc.
  const moneyRegex = /(?:[\$€£¥]\s*[\d,]+(?:\.\d{2})?|\b[\d,]+(?:\.\d{2})?\s*(?:USD|EUR|GBP|CAD|AUD)\b)/gi;
  const monetary = Array.from(new Set(fullText.match(moneyRegex) || [])).slice(0, 12);

  // Action items: sentences containing keywords like "must", "shall", "action required", "deadline", "todo"
  const lines = fullText.split('\n');
  const actionItems: string[] = [];
  const actionTriggers = /\b(must|shall|required to|action item|deadline|deliverable|due date|please ensure|responsible for)\b/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 20 && trimmed.length < 200 && actionTriggers.test(trimmed)) {
      if (!actionItems.includes(trimmed)) {
        actionItems.push(trimmed);
        if (actionItems.length >= 8) break;
      }
    }
  }

  // Potential entities / Proper names (capitalized words following indicators or recurring)
  const nameRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  const matches = fullText.match(nameRegex) || [];
  const commonWords = new Set(['United States', 'New York', 'North America', 'European Union', 'January', 'December']);
  const filteredNames = Array.from(new Set(matches.filter((m) => !commonWords.has(m)))).slice(0, 10);

  return {
    dates,
    monetary,
    names: filteredNames,
    actionItems,
  };
}

/**
 * Generate interactive study flashcards & quiz locally based on key document passages
 */
export function generateLocalStudyKit(pages: ExtractedPageText[]): {
  quiz: Array<{ question: string; options: string[]; correctIndex: number; explanation: string }>;
  flashcards: Array<{ front: string; back: string }>;
} {
  const fullText = pages.map((p) => p.text).join(' ');
  const sentences = fullText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 250);

  const flashcards: Array<{ front: string; back: string }> = [];
  const quiz: Array<{ question: string; options: string[]; correctIndex: number; explanation: string }> = [];

  // Look for definitional patterns (X is defined as Y, X refers to Y, X means Y)
  const defPattern = /([A-Z][a-zA-Z\s]{2,25})\s+(?:is defined as|refers to|means|represents|consists of)\s+([^.]+)/i;

  for (const sentence of sentences) {
    const match = sentence.match(defPattern);
    if (match && flashcards.length < 6) {
      flashcards.push({
        front: `What is ${match[1].trim()}?`,
        back: `${match[1].trim()} ${match[0].slice(match[1].length).trim()}.`,
      });
    }
  }

  // Fallback cards if no strict definitions found
  if (flashcards.length === 0 && sentences.length > 0) {
    for (let i = 0; i < Math.min(4, sentences.length); i++) {
      const words = sentences[i].split(' ');
      const keyConcept = words.slice(0, 4).join(' ');
      flashcards.push({
        front: `Key Concept: ${keyConcept}...`,
        back: sentences[i],
      });
    }
  }

  // Quiz generation from sentences with numerical or entity facts
  for (let i = 0; i < Math.min(3, sentences.length); i++) {
    const s = sentences[i];
    quiz.push({
      question: `According to the document: "${s.slice(0, 90)}..." — What is the primary takeaway?`,
      options: [
        s,
        `Contradicts the stated finding in section ${i + 1}.`,
        'Applies only under external non-specified testing conditions.',
        'Not addressed in the source document.',
      ],
      correctIndex: 0,
      explanation: `Directly supported by the document text on page ${pages[0]?.pageNumber || 1}.`,
    });
  }

  return { quiz, flashcards };
}

/**
 * Text-to-speech engine using standard browser SpeechSynthesis
 * 100% private, runs entirely on the user's device
 */
export class BrowserAudioNarrator {
  private synth: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  public isSpeaking = false;
  public isPaused = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isAvailable(): boolean {
    return this.synth !== null;
  }

  public speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): void {
    if (!this.synth) return;
    this.stop();

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = options.rate ?? 1.0;
    this.utterance.pitch = options.pitch ?? 1.0;

    this.utterance.onend = () => {
      this.isSpeaking = false;
      this.isPaused = false;
      options.onEnd?.();
    };

    this.utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.isPaused = false;
      options.onError?.(e);
    };

    this.isSpeaking = true;
    this.isPaused = false;
    this.synth.speak(this.utterance);
  }

  public pause(): void {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  public resume(): void {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.isPaused = false;
    }
  }
}
