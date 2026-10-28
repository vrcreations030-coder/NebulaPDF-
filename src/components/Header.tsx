import React, { useState } from 'react';
import { CosmicLogo } from './CosmicLogo';
import type { ToolId } from '../types';
import { Menu, X, Trash2, ShieldCheck, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentRoute: ToolId;
  onNavigate: (route: ToolId) => void;
  onClearSession: () => void;
  hasActiveFiles: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  onClearSession,
  hasActiveFiles,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (route: ToolId) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0B0D12]/90 backdrop-blur-md border-b border-[#282D3A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => handleNav('home')}
          className="cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] rounded-lg"
          aria-label="NebulaPDF Home"
        >
          <CosmicLogo size={36} />
        </button>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9CA3AF]">
          <button
            onClick={() => handleNav('home')}
            className={`whitespace-nowrap transition-colors hover:text-white cursor-pointer ${
              currentRoute === 'home' ? 'text-white font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNav('all-tools')}
            className={`whitespace-nowrap transition-colors hover:text-white cursor-pointer ${
              currentRoute === 'all-tools' ? 'text-white font-semibold' : ''
            }`}
          >
            All Tools
          </button>
          <button
            onClick={() => handleNav('ai-studio')}
            className={`whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 cursor-pointer ${
              currentRoute === 'ai-studio' ? 'text-[#8B5CF6] font-semibold' : ''
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
            AI Studio
          </button>
          <button
            onClick={() => handleNav('privacy-center')}
            className={`whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 cursor-pointer ${
              currentRoute === 'privacy-center' ? 'text-[#7DD3FC] font-semibold' : ''
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#7DD3FC]" />
            Privacy
          </button>
          <button
            onClick={() => handleNav('about')}
            className={`whitespace-nowrap transition-colors hover:text-white cursor-pointer ${
              currentRoute === 'about' ? 'text-white font-semibold' : ''
            }`}
          >
            About
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {hasActiveFiles && (
            <button
              onClick={onClearSession}
              title="Clear active documents from browser memory"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg border border-rose-900/50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Session</span>
            </button>
          )}

          <button
            onClick={() => handleNav('all-tools')}
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] rounded-lg shadow-[0_0_12px_rgba(139,92,246,0.25)] transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7DD3FC]"
          >
            Open Tools
          </button>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#9CA3AF] hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#282D3A] bg-[#151923] px-4 py-4 space-y-3">
          <button
            onClick={() => handleNav('home')}
            className="w-full text-left py-2 text-sm text-slate-200 hover:text-white"
          >
            Home
          </button>
          <button
            onClick={() => handleNav('all-tools')}
            className="w-full text-left py-2 text-sm text-slate-200 hover:text-white"
          >
            All PDF Tools
          </button>
          <button
            onClick={() => handleNav('ai-studio')}
            className="w-full text-left py-2 text-sm text-[#8B5CF6] hover:text-[#a78bfa] flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> AI PDF Studio
          </button>
          <button
            onClick={() => handleNav('workflow')}
            className="w-full text-left py-2 text-sm text-slate-200 hover:text-white"
          >
            Workflow Builder
          </button>
          <button
            onClick={() => handleNav('privacy-center')}
            className="w-full text-left py-2 text-sm text-[#7DD3FC] hover:text-cyan-300 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Privacy Center
          </button>
          <button
            onClick={() => handleNav('about')}
            className="w-full text-left py-2 text-sm text-slate-200 hover:text-white"
          >
            About & Architecture
          </button>
          <button
            onClick={() => handleNav('contact')}
            className="w-full text-left py-2 text-sm text-slate-200 hover:text-white"
          >
            Contact & Feedback
          </button>
          {hasActiveFiles && (
            <button
              onClick={() => {
                onClearSession();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 text-sm text-rose-400 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear Session Data
            </button>
          )}
        </div>
      )}
    </header>
  );
};
