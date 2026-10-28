import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Send,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';

interface StaticViewProps {
  onBack: () => void;
}

/**
 * About NebulaPDF View
 */
export const AboutView: React.FC<StaticViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">About NebulaPDF</h1>
        <p className="text-sm text-[#9CA3AF]">Your Documents. Infinite Possibilities.</p>
      </div>

      <div className="space-y-6 text-xs text-slate-300 leading-relaxed p-6 rounded-2xl bg-[#151923] border border-[#282D3A]">
        <h2 className="text-base font-bold text-white">Our Mission</h2>
        <p>
          NebulaPDF was created to eliminate the privacy risks, subscription paywalls, and file-upload vulnerabilities inherent in legacy online PDF services. Traditional PDF websites force users to upload sensitive contracts, invoices, medical records, and legal briefs to remote servers where they may be stored, analyzed, or leaked.
        </p>

        <h2 className="text-base font-bold text-white pt-2">The Browser-First Philosophy</h2>
        <p>
          With modern advancements in WebAssembly, JavaScript engines, and browser sandbox capabilities, documents no longer need to be transferred across the internet for routine document manipulations. NebulaPDF executes merging, splitting, OCR, rotations, compression, and watermarking entirely in your device's memory.
        </p>

        <h2 className="text-base font-bold text-white pt-2">Zero Paid Dependencies</h2>
        <p>
          NebulaPDF is designed from the ground up to deploy seamlessly to Cloudflare Pages Free. It requires no paid domain, no database clusters, no expensive server hosting, and no forced recurring subscriptions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
          <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A]">
            <p className="text-[#8B5CF6] font-bold text-sm">Core PDF Engine</p>
            <p className="text-[#9CA3AF] mt-1">Built with pdf-lib, PDF.js, and JSZip running locally.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A]">
            <p className="text-[#7DD3FC] font-bold text-sm">Optical Character Recognition</p>
            <p className="text-[#9CA3AF] mt-1">Powered by client-side Tesseract.js with on-demand models.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Contact & Feedback View
 */
export const ContactView: React.FC<StaticViewProps> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback / Feature Suggestion');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Contact & Feedback</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Have an idea for a new tool or encountered an issue with a document? Share your feedback with our engineering team.
        </p>
      </div>

      {submitted ? (
        <div className="p-8 rounded-2xl bg-[#151923] border border-emerald-500/50 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Thank You for Your Feedback!</h2>
          <p className="text-xs text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
            Your message has been recorded locally. We appreciate your input as we continue improving the NebulaPDF toolkit.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setMessage('');
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-[#0B0D12] border border-[#282D3A] rounded-lg hover:text-white cursor-pointer"
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">Your Name (Optional):</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">Your Email (Optional):</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#9CA3AF] block mb-1">Topic:</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="Feedback / Feature Suggestion">Feature Suggestion</option>
              <option value="Bug Report">Bug Report</option>
              <option value="General Question">General Question</option>
              <option value="Security Inquiry">Security Inquiry</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-[#9CA3AF] block mb-1">Message:</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you'd like to see added, or report an issue..."
              className="w-full px-3 py-2 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-xs text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Message</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

/**
 * Privacy Policy View
 */
export const PrivacyPolicyView: React.FC<StaticViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-[#9CA3AF]">Effective Date: October 2026 · Global English Edition</p>
      </div>

      <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-5 text-xs text-slate-300 leading-relaxed">
        <h2 className="text-sm font-bold text-white">1. Information We Do Not Collect</h2>
        <p>
          NebulaPDF operates on a zero-collection architecture. All ordinary document processing operations (including Merge, Split, Extract, Rotate, Reorder, Delete Pages, Watermark, Add Page Numbers, PDF to Images, Images to PDF, Compress, and OCR) execute solely inside your web browser’s local client sandbox. Your documents are never uploaded to, transmitted across, or stored upon our servers.
        </p>

        <h2 className="text-sm font-bold text-white pt-2">2. Local Storage and Memory Handling</h2>
        <p>
          Document binary data is kept only in transient memory (RAM) while you are interacting with the tool. Document data is never saved to persistent browser storage like localStorage or IndexedDB without explicit user action.
        </p>

        <h2 className="text-sm font-bold text-white pt-2">3. Optional External AI Features</h2>
        <p>
          If you choose to use external AI features (powered via a Cloudflare Pages Function proxy), the app requires explicit user consent and shows the exact text snippet before transmission. No personal user profiles or persistent IDs are attached to AI requests.
        </p>

        <h2 className="text-sm font-bold text-white pt-2">4. Cookies and Telemetry</h2>
        <p>
          NebulaPDF does not use third-party tracking cookies, user profiling beacons, or monetization analytics.
        </p>
      </div>
    </div>
  );
};

/**
 * Terms of Use View
 */
export const TermsView: React.FC<StaticViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Use</h1>
        <p className="text-xs text-[#9CA3AF]">Applicable to all users of NebulaPDF</p>
      </div>

      <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-5 text-xs text-slate-300 leading-relaxed">
        <h2 className="text-sm font-bold text-white">1. Acceptance of Terms</h2>
        <p>
          By accessing and using NebulaPDF, you agree to these Terms of Use. If you do not agree, please discontinue use of the toolkit immediately.
        </p>

        <h2 className="text-sm font-bold text-white pt-2">2. Client-Side Software License</h2>
        <p>
          NebulaPDF is provided free of charge for personal, educational, and commercial document processing. You may use the tools freely without payment or account creation.
        </p>

        <h2 className="text-sm font-bold text-white pt-2">3. Acceptable Use and Document Ownership</h2>
        <p>
          You retain 100% full ownership and copyright of any documents or images you process through NebulaPDF. You agree not to use the software to process unlawful, defamatory, or infringing content.
        </p>

        <h2 className="text-sm font-bold text-white pt-2">4. Disclaimer of Warranty</h2>
        <p>
          The software is provided "as is", without warranty of any kind, express or implied. NebulaPDF does not warrant that operations will be error-free or that browser memory will not be exhausted by exceptionally large documents.
        </p>
      </div>
    </div>
  );
};

/**
 * Legal Disclaimer View
 */
export const DisclaimerView: React.FC<StaticViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Legal Disclaimer</h1>
        <p className="text-xs text-[#9CA3AF]">Transparency & Limitations</p>
      </div>

      <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-5 text-xs text-slate-300 leading-relaxed">
        <div className="p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            NebulaPDF is an automated document utility and does not constitute legal, tax, or medical advice.
          </span>
        </div>

        <h2 className="text-sm font-bold text-white pt-1">1. AI Outputs and Local Heuristics</h2>
        <p>
          Summaries, entity extractions, and quiz flashcards produced by AI PDF Studio or local heuristic parsers are generated programmatically. While we strive for accuracy, users must verify all extracted dates, monetary figures, and legal terms against the original document before taking action.
        </p>

        <h2 className="text-sm font-bold text-white pt-2">2. Hardware and Browser Limits</h2>
        <p>
          Because operations occur locally in your browser, extremely large files (&gt;100MB) or PDFs with complex vector paths may run slower or hit browser memory ceilings on low-spec hardware. We advise verifying generated files before deleting your originals.
        </p>
      </div>
    </div>
  );
};
