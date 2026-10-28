import React from 'react';
import { CosmicLogo } from './CosmicLogo';
import type { ToolId } from '../types';
import { ShieldCheck, HardDrive, Cpu, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: ToolId) => void;
  onClearSession: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onClearSession }) => {
  return (
    <footer className="w-full bg-[#0B0D12] border-t border-[#282D3A] text-[#9CA3AF] text-xs pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#282D3A]/60">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <CosmicLogo size={32} />
            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
              Your Documents. Infinite Possibilities.
            </p>
            <p className="text-xs text-[#9CA3AF] max-w-sm leading-relaxed">
              Free PDF Tools • Smart AI • Privacy First. All ordinary PDF manipulations run strictly client-side inside your browser sandbox. No file uploads, no tracking, no subscription walls.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] pt-2">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Local Processing</span>
              </span>
              <span className="text-[#282D3A]">|</span>
              <span className="flex items-center gap-1.5 text-[#7DD3FC]">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Zero Server Uploads</span>
              </span>
              <span className="text-[#282D3A]">|</span>
              <span className="flex items-center gap-1.5 text-[#8B5CF6]">
                <Cpu className="w-3.5 h-3.5" />
                <span>Cloudflare Pages Free</span>
              </span>
            </div>
          </div>

          {/* Column 1: Core Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Core Tools</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('merge')} className="hover:text-white transition-colors cursor-pointer">
                  Merge PDF
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('split')} className="hover:text-white transition-colors cursor-pointer">
                  Split & Extract Pages
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('rotate')} className="hover:text-white transition-colors cursor-pointer">
                  Rotate & Reorder
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pdf-to-images')} className="hover:text-white transition-colors cursor-pointer">
                  PDF to JPG / PNG
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('images-to-pdf')} className="hover:text-white transition-colors cursor-pointer">
                  Images to PDF
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('compress')} className="hover:text-white transition-colors cursor-pointer">
                  Compress PDF
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('ocr')} className="hover:text-white transition-colors cursor-pointer">
                  Browser OCR Reader
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Advanced & AI */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Smart Utilities</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('ai-studio')} className="text-[#8B5CF6] hover:text-[#a78bfa] transition-colors cursor-pointer">
                  AI PDF Studio
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('workflow')} className="hover:text-white transition-colors cursor-pointer">
                  Workflow Builder
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('document-pack')} className="hover:text-white transition-colors cursor-pointer">
                  Document Pack & Cover
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('compare')} className="hover:text-white transition-colors cursor-pointer">
                  PDF Text Compare
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('health-check')} className="hover:text-white transition-colors cursor-pointer">
                  PDF Health Check
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('form-helper')} className="hover:text-white transition-colors cursor-pointer">
                  PDF Form Helper
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Privacy & Legal</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('privacy-center')} className="text-[#7DD3FC] hover:text-cyan-300 transition-colors cursor-pointer">
                  Privacy Center
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy-policy')} className="hover:text-white transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors cursor-pointer">
                  Terms of Use
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('disclaimer')} className="hover:text-white transition-colors cursor-pointer">
                  Legal Disclaimer
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition-colors cursor-pointer">
                  About NebulaPDF
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Contact & Feedback
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#9CA3AF]/80">
          <p>© {new Date().getFullYear()} NebulaPDF. Built for high-speed client-side execution. No user document retention.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={onClearSession}
              className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              Flush Browser Cache & Session
            </button>
            <span>·</span>
            <span>English (US)</span>
            <span>·</span>
            <span>Ready for Cloudflare Pages</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
