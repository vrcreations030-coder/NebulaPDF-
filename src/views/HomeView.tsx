import React, { useState } from 'react';
import { ALL_TOOLS } from '../data/toolsData';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { SmartToolFinder } from '../components/SmartToolFinder';
import { loadPdfJsDoc } from '../services/pdfEngine';
import type { ToolId, PDFToolMeta } from '../types';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  Scissors,
  RotateCw,
  FileImage,
  Images,
  Minimize2,
  ScanText,
  FileText,
  Lock,
  ChevronDown,
  HardDrive,
  CheckCircle2,
  Search,
} from 'lucide-react';

interface HomeViewProps {
  onSelectTool: (toolId: ToolId) => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
  onRemoveSharedFile: (index: number) => void;
  onClearSharedFiles: () => void;
}

// Icon mapping helper
const ToolIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Layers': return <Layers className={className} />;
    case 'Scissors': return <Scissors className={className} />;
    case 'RotateCw': return <RotateCw className={className} />;
    case 'FileImage': return <FileImage className={className} />;
    case 'Images': return <Images className={className} />;
    case 'Minimize2': return <Minimize2 className={className} />;
    case 'ScanText': return <ScanText className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    default: return <FileText className={className} />;
  }
};

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectTool,
  sharedFiles,
  onAddSharedFiles,
  onRemoveSharedFile,
  onClearSharedFiles,
}) => {
  const [toolSearch, setToolSearch] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const popularTools = ALL_TOOLS.filter((t) => t.isPopular);

  // Handle file uploads in hero dropzone
  const handleHeroFiles = async (files: File[]) => {
    const newItems: UploadedPDFFile[] = [];
    for (const f of files) {
      try {
        const buffer = await f.arrayBuffer();
        let pageCount: number | undefined = undefined;
        if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
          try {
            const pdfDoc = await loadPdfJsDoc(buffer);
            pageCount = pdfDoc.numPages;
          } catch {
            // non-critical preview error
          }
        }
        newItems.push({ file: f, buffer, pageCount });
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }
    if (newItems.length > 0) {
      onAddSharedFiles(newItems);
    }
  };

  const filteredTools = toolSearch.trim()
    ? ALL_TOOLS.filter(
        (t) =>
          t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
          t.description.toLowerCase().includes(toolSearch.toLowerCase()) ||
          t.tagline.toLowerCase().includes(toolSearch.toLowerCase())
      )
    : popularTools;

  const faqs = [
    {
      q: 'Are my PDF files uploaded to a remote server?',
      a: 'No. All core PDF operations (merging, splitting, rotating, converting, page deletion, watermarking, and OCR) are processed entirely inside your browser using client-side WebAssembly and JavaScript engines (pdf-lib, PDF.js, and Tesseract.js). Your documents never leave your device.',
    },
    {
      q: 'Does NebulaPDF require a subscription or paid API key?',
      a: 'No. The entire suite of core PDF tools is completely free, requires no user account, and requires no paid domain or hosting. It is built to deploy seamlessly to Cloudflare Pages Free.',
    },
    {
      q: 'How does the AI PDF Studio handle document privacy?',
      a: 'AI features offer both a 100% private local analysis engine (extracting summaries, dates, monetary entities, and study cards directly in browser memory) and an optional Cloudflare Pages Function proxy. If an external AI provider is connected, the app explicitly asks for your consent and shows the exact text to be sent beforehand.',
    },
    {
      q: 'What is the maximum file size I can process?',
      a: 'Because operations execute inside your browser sandbox, performance is governed by your computer or phone RAM. Documents up to 80MB-100MB process smoothly on modern devices. For extraordinarily large files, a warning notice is displayed.',
    },
    {
      q: 'Can I use NebulaPDF on mobile devices or tablets?',
      a: 'Yes! NebulaPDF is fully responsive, touch-optimized, and accessible. You can upload photos directly from your phone camera or document storage to convert or edit them on the go.',
    },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center space-y-8">
        {/* Ambient subtle glow background */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-10 -z-10 transform-gpu overflow-hidden blur-3xl"
        >
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#8B5CF6]/20 to-[#7DD3FC]/15 opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        {/* Quiet headline kicker */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171329] border border-[#8B5CF6]/30 text-xs font-medium text-[#7DD3FC]">
          <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>Free PDF Tools • Smart AI • Privacy First</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white text-balance leading-tight">
            Every PDF. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-[#7DD3FC]">
              One Smart Universe.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
            Free tools to merge, convert, organize and understand your documents. Built with high-speed browser-local processing. No uploads. No fees.
          </p>
        </div>

        {/* Hero Dropzone Card */}
        <div className="max-w-3xl mx-auto pt-4 text-left">
          <DropZone
            title="Drop PDF documents here or click to browse"
            description="Process multiple files securely in browser memory. Choose a tool below to execute."
            multiple={true}
            onFilesSelected={handleHeroFiles}
            selectedFiles={sharedFiles}
            onRemoveFile={onRemoveSharedFile}
            onClearAll={onClearSharedFiles}
          />

          {sharedFiles.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-[#171329] border border-[#8B5CF6]/40 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-200">
                <span className="font-semibold text-white">{sharedFiles.length} file{sharedFiles.length > 1 ? 's' : ''}</span> ready for action. Choose what to do next:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onSelectTool('merge')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition-colors cursor-pointer"
                >
                  Merge All
                </button>
                <button
                  onClick={() => onSelectTool('split')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#151923] hover:bg-[#282D3A] border border-[#282D3A] rounded-lg transition-colors cursor-pointer"
                >
                  Split / Extract
                </button>
                <button
                  onClick={() => onSelectTool('ai-studio')}
                  className="px-3 py-1.5 text-xs font-semibold text-[#7DD3FC] bg-[#151923] hover:bg-[#282D3A] border border-[#7DD3FC]/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#8B5CF6]" />
                  AI Studio
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Popular Tools Section with Search */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Popular PDF Tools
            </h2>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
              Select a specialized tool or search across all 25+ browser operations.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              placeholder="Search tools..."
              className="w-full pl-9 pr-3 py-2 bg-[#151923] border border-[#282D3A] rounded-lg text-xs text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="group p-5 rounded-xl bg-[#151923] border border-[#282D3A] hover:border-[#8B5CF6]/50 hover:bg-[#171c28] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#171329] border border-[#282D3A] group-hover:border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6] transition-colors">
                  <ToolIcon name={tool.icon} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-[#7DD3FC] transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#282D3A]/60 flex items-center justify-between text-xs text-[#8B5CF6] font-medium group-hover:translate-x-1 transition-transform">
                <span>Open tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => onSelectTool('all-tools')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#151923] hover:bg-[#171329] border border-[#282D3A] rounded-xl transition-all cursor-pointer"
          >
            <span>View All 25+ PDF Tools & Utilities</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#8B5CF6]" />
          </button>
        </div>
      </section>

      {/* Smart Tool Finder Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SmartToolFinder onSelectTool={onSelectTool} />
      </section>

      {/* AI PDF Studio Feature Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#171329] via-[#151923] to-[#0B0D12] border border-[#8B5CF6]/30 p-8 sm:p-12 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-xs font-semibold text-[#8B5CF6]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Document Intelligence</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                AI PDF Studio
              </h2>

              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                Interact with your documents intelligently. Summarize contracts, extract critical dates & monetary amounts, generate flashcards, search text with exact page citations, and listen via text-to-speech.
              </p>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#7DD3FC]" />
                  <span><strong>100% Local Heuristic Engine:</strong> Summaries, entity detection, and quiz generation run completely offline.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#8B5CF6]" />
                  <span><strong>Optional Cloudflare Pages AI Proxy:</strong> Connect Gemini API seamlessly via server-side secrets with zero client exposure.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span><strong>Explicit User Consent:</strong> Nothing is transmitted externally without your review and approval.</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onSelectTool('ai-studio')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch AI PDF Studio</span>
                </button>
              </div>
            </div>

            {/* Visual interactive preview frame */}
            <div className="p-6 rounded-2xl bg-[#0B0D12] border border-[#282D3A] space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#282D3A]">
                <span className="text-xs font-mono text-[#7DD3FC] flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Document Intelligence Preview
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  Local Mode Active
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-[#151923] border border-[#282D3A]">
                  <p className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider mb-1">
                    Extracted Action Items
                  </p>
                  <p className="text-slate-300">
                    "Section 4.2: Deliverables must be reviewed within 5 business days of receipt."
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#151923] border border-[#282D3A]">
                  <p className="text-[11px] font-semibold text-[#7DD3FC] uppercase tracking-wider mb-1">
                    Study Flashcard
                  </p>
                  <p className="text-slate-300">
                    <strong className="text-white">Q:</strong> What is the liability cap specified in Section 9?
                  </p>
                  <p className="text-[#9CA3AF] mt-1 text-[11px]">
                    <strong className="text-white">A:</strong> Limited to fees paid during the preceding 12 months.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy-First Explanation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#151923] border border-[#282D3A] space-y-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Architectural Privacy Guarantee</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Your Documents Never Leave Your Device
            </h2>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-2 leading-relaxed">
              Most online PDF converters transmit your files across the internet to third-party cloud servers. NebulaPDF operates differently: all PDF parsing, page extraction, conversion, and rendering happen inside your browser memory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-2.5">
              <HardDrive className="w-6 h-6 text-[#7DD3FC]" />
              <h3 className="text-sm font-semibold text-white">Zero Server Uploads</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Core operations utilize pure client-side WebAssembly and JavaScript engines. No files are stored or logged on any server.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-2.5">
              <Lock className="w-6 h-6 text-[#8B5CF6]" />
              <h3 className="text-sm font-semibold text-white">Browser Memory Sandbox</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Files are kept strictly in transient memory. Clicking "Clear Session" or closing the tab instantly flushes all loaded data.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-2.5">
              <Zap className="w-6 h-6 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">No Subscription or Tracking</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                No user accounts, no tracking cookies, no credit card prompts, and no artificial paywalls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How NebulaPDF Works
          </h2>
          <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-lg mx-auto">
            Three simple steps to manage your documents with maximum speed and zero friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
            <span className="text-2xl font-bold font-mono text-[#8B5CF6]">01.</span>
            <h3 className="text-base font-semibold text-white">Select or Drop Files</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Drag your PDFs or image files into the browser. Files are decoded in local browser memory without uploading.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
            <span className="text-2xl font-bold font-mono text-[#7DD3FC]">02.</span>
            <h3 className="text-base font-semibold text-white">Configure Your Tool</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Select page ranges, rotate angles, set watermarks, extract selectable text, or generate AI flashcards.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
            <span className="text-2xl font-bold font-mono text-emerald-400">03.</span>
            <h3 className="text-base font-semibold text-white">Save Instantly</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Download the generated PDF or ZIP archive immediately onto your device with original fidelity.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[#9CA3AF]">
            Clear, honest answers about our technology, security, and browser capabilities.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={faq.q}
                className="rounded-xl bg-[#151923] border border-[#282D3A] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 text-sm font-semibold text-white hover:text-[#7DD3FC] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#9CA3AF] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#8B5CF6]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 text-xs text-[#9CA3AF] leading-relaxed border-t border-[#282D3A]/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
