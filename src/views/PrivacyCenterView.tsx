import React from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  HardDrive,
  Cpu,
  Lock,
  Trash2,
  CheckCircle2,
  EyeOff,
  ServerOff,
} from 'lucide-react';

interface PrivacyCenterViewProps {
  onBack: () => void;
  onClearSession: () => void;
}

export const PrivacyCenterView: React.FC<PrivacyCenterViewProps> = ({ onBack, onClearSession }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tools</span>
      </button>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Confidentiality</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">NebulaPDF Privacy Center</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-2xl leading-relaxed">
          How our architecture guarantees that your sensitive documents, financial contracts, and personal records remain private on your computer or mobile device.
        </p>
      </div>

      {/* Core Privacy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
          <ServerOff className="w-6 h-6 text-[#7DD3FC]" />
          <h3 className="text-base font-semibold text-white">100% Client-Side Execution</h3>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Every core PDF action—merging, splitting, OCR, compression, page rotation, and reordering—executes inside your browser sandbox via WebAssembly (pdf-lib, PDF.js, and Tesseract.js). No files are uploaded to any server.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
          <EyeOff className="w-6 h-6 text-[#8B5CF6]" />
          <h3 className="text-base font-semibold text-white">Zero Document Storage</h3>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            We do not store document files in localStorage, IndexedDB, or remote cloud buckets. Loaded PDFs exist solely in transient JavaScript memory and are discarded when you navigate away or click Flush Session.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
          <Lock className="w-6 h-6 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Explicit AI Consent Gate</h3>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            AI document features run in local heuristic mode by default. If optional external AI is invoked, you are shown the exact text passage to be sent with an explicit confirmation modal.
          </p>
        </div>
      </div>

      {/* Deep-Dive Architectural Explanations */}
      <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-6 text-xs text-slate-300 leading-relaxed">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Detailed Technical Protections
        </h3>

        <div className="space-y-4 divide-y divide-[#282D3A]/60">
          <div className="pt-3">
            <h4 className="font-semibold text-white mb-1">1. Network Air-Gap for PDF Tools</h4>
            <p className="text-[#9CA3AF]">
              You can disconnect your internet connection (turn on Airplane Mode) after loading NebulaPDF, and all your PDF tools—Merge, Split, Extract, Compress, Watermark, and Page Numbering—will continue to operate smoothly. This proves no server roundtrips take place.
            </p>
          </div>

          <div className="pt-3">
            <h4 className="font-semibold text-white mb-1">2. Local Memory & RAM Considerations</h4>
            <p className="text-[#9CA3AF]">
              Because files are decoded in browser RAM, documents larger than 80MB-100MB may require sufficient device memory. We honestly warn users about memory limitations rather than silently offloading processing to insecure cloud clusters.
            </p>
          </div>

          <div className="pt-3">
            <h4 className="font-semibold text-white mb-1">3. Cloudflare Pages Free Deployment Compatibility</h4>
            <p className="text-[#9CA3AF]">
              NebulaPDF is designed to run statically on Cloudflare Pages without needing paid databases or hosting. Any optional AI proxy uses server-side environment secrets under <code className="text-[#7DD3FC] font-mono">/functions/api/ai.ts</code> so API keys are never leaked to user browsers.
            </p>
          </div>

          <div className="pt-3">
            <h4 className="font-semibold text-white mb-1">4. Compliance with GDPR, CCPA, and Confidentiality Standards</h4>
            <p className="text-[#9CA3AF]">
              Because no personal data or document content is collected, stored, or processed by NebulaPDF servers, your interactions remain compliant with privacy directives without tracking cookies or advertising telemetry.
            </p>
          </div>
        </div>
      </div>

      {/* Immediate Session Purge Card */}
      <div className="p-6 rounded-2xl bg-[#171329] border border-rose-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            Flush Active Browser Memory
          </h3>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Instantly revokes all active object URLs, frees ArrayBuffers, and resets app state.
          </p>
        </div>

        <button
          onClick={onClearSession}
          className="px-5 py-2.5 text-xs font-semibold text-rose-200 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          Purge Transient Session
        </button>
      </div>
    </div>
  );
};
