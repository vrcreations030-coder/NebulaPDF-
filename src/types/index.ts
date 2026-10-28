export type ToolId =
  | 'home'
  | 'all-tools'
  | 'merge'
  | 'split'
  | 'extract'
  | 'delete-pages'
  | 'reorder'
  | 'rotate'
  | 'pdf-to-images'
  | 'images-to-pdf'
  | 'compress'
  | 'watermark'
  | 'page-numbers'
  | 'preview'
  | 'compare'
  | 'annotate'
  | 'ocr'
  | 'ai-studio'
  | 'health-check'
  | 'workflow'
  | 'document-pack'
  | 'form-helper'
  | 'privacy-center'
  | 'about'
  | 'contact'
  | 'privacy-policy'
  | 'terms'
  | 'disclaimer';

export type ToolCategory =
  | 'all'
  | 'organize'
  | 'convert'
  | 'edit'
  | 'security-inspect'
  | 'ai-smart';

export type ToolStatus = 'Working' | 'Experimental' | 'Requires Setup';

export interface PDFToolMeta {
  id: ToolId;
  name: string;
  tagline: string;
  description: string;
  category: ToolCategory;
  icon: string;
  status: ToolStatus;
  isPopular?: boolean;
  isNew?: boolean;
  isAI?: boolean;
}

export interface PDFMetadataInfo {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
  fileSize: number;
  pdfVersion?: string;
  hasForms?: boolean;
  formFieldsCount?: number;
  pageDimensions?: { width: number; height: number; unit: string }[];
}

export interface RecentActivityItem {
  id: string;
  toolName: string;
  timestamp: string;
  fileCount: number;
  status: 'success' | 'failed';
}

export interface ExtractedPageText {
  pageNumber: number;
  text: string;
}

export interface AIAnalysisResult {
  summary?: string;
  keyEntities?: {
    dates: string[];
    monetary: string[];
    names: string[];
    actionItems: string[];
  };
  explanation?: string;
  translation?: string;
  quiz?: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  flashcards?: Array<{
    front: string;
    back: string;
  }>;
}
