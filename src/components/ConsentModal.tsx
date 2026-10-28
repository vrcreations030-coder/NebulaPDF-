import React from 'react';
import { ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  textSnippet: string;
  onConfirm: () => void;
  onCancel: () => void;
  targetService?: string;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  textSnippet,
  onConfirm,
  onCancel,
  targetService = 'External AI Proxy (Gemini API via Cloudflare Function)',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#151923] border border-[#8B5CF6]/40 rounded-2xl p-6 shadow-[0_0_30px_rgba(139,92,246,0.2)] space-y-5">
        <div className="flex items-center gap-3 text-rose-400">
          <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">External AI Transmission Consent</h3>
            <p className="text-xs text-[#9CA3AF]">Your explicit authorization is required</p>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            Unlike our core PDF operations (which run 100% locally in your browser), this AI feature transmits the selected text passage to <strong className="text-white">{targetService}</strong> for processing.
          </p>
          <div className="flex items-start gap-2 p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>Do not send sensitive personal data, passwords, or confidential trade secrets. NebulaPDF never logs your prompts.</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
            Review text to be transmitted ({textSnippet.length} characters):
          </label>
          <div className="max-h-36 overflow-y-auto p-3 bg-[#0B0D12] border border-[#282D3A] rounded-lg text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
            {textSnippet ? textSnippet.slice(0, 1500) : '(No text preview available)'}
            {textSnippet.length > 1500 && '... [truncated preview]'}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#282D3A]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white bg-[#171329] border border-[#282D3A] hover:bg-[#282D3A] rounded-lg transition-colors cursor-pointer"
          >
            Cancel (Keep Local)
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] rounded-lg transition-all shadow-sm cursor-pointer"
          >
            I Consent & Transmit
          </button>
        </div>
      </div>
    </div>
  );
};
