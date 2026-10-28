import React, { useState } from 'react';
import { Search, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { ALL_TOOLS } from '../data/toolsData';
import type { ToolId, PDFToolMeta } from '../types';

interface SmartToolFinderProps {
  onSelectTool: (id: ToolId) => void;
}

export const SmartToolFinder: React.FC<SmartToolFinderProps> = ({ onSelectTool }) => {
  const [query, setQuery] = useState('');

  const quickPrompts = [
    'Combine 3 invoices into one file',
    'Remove pages 2 and 4 from my contract',
    'Extract text from a scanned photo',
    'Add confidential watermark',
    'Shrink file size for email attachment',
    'Read aloud or summarize notes',
  ];

  // Match query against tool keywords, names, and descriptions
  const getMatchingTools = (text: string): PDFToolMeta[] => {
    if (!text.trim()) return [];
    const q = text.toLowerCase();

    const scored = ALL_TOOLS.map((tool) => {
      let score = 0;
      const tName = tool.name.toLowerCase();
      const tDesc = tool.description.toLowerCase();
      const tTag = tool.tagline.toLowerCase();

      if (tName.includes(q)) score += 10;
      if (tTag.includes(q)) score += 6;
      if (tDesc.includes(q)) score += 4;

      // Semantic phrase mapping
      if (q.includes('combine') || q.includes('join') || q.includes('merge') || q.includes('together')) {
        if (tool.id === 'merge') score += 15;
        if (tool.id === 'document-pack') score += 8;
      }
      if (q.includes('split') || q.includes('cut') || q.includes('divide') || q.includes('break')) {
        if (tool.id === 'split') score += 15;
      }
      if (q.includes('delete') || q.includes('remove') || q.includes('discard') || q.includes('unwanted')) {
        if (tool.id === 'delete-pages') score += 15;
      }
      if (q.includes('extract') || q.includes('pull out') || q.includes('pick pages')) {
        if (tool.id === 'extract') score += 15;
      }
      if (q.includes('ocr') || q.includes('scan') || q.includes('photo') || q.includes('picture to text')) {
        if (tool.id === 'ocr') score += 15;
      }
      if (q.includes('compress') || q.includes('shrink') || q.includes('smaller') || q.includes('reduce size')) {
        if (tool.id === 'compress') score += 15;
      }
      if (q.includes('rotate') || q.includes('sideways') || q.includes('upside down') || q.includes('turn')) {
        if (tool.id === 'rotate') score += 15;
      }
      if (q.includes('watermark') || q.includes('stamp') || q.includes('confidential') || q.includes('draft')) {
        if (tool.id === 'watermark') score += 15;
      }
      if (q.includes('page number') || q.includes('numbering') || q.includes('paginate')) {
        if (tool.id === 'page-numbers') score += 15;
      }
      if (q.includes('summarize') || q.includes('chat') || q.includes('read aloud') || q.includes('audio') || q.includes('ai') || q.includes('quiz')) {
        if (tool.id === 'ai-studio') score += 15;
      }
      if (q.includes('compare') || q.includes('difference') || q.includes('diff') || q.includes('changed')) {
        if (tool.id === 'compare') score += 15;
      }
      if (q.includes('chain') || q.includes('multi step') || q.includes('sequence') || q.includes('workflow')) {
        if (tool.id === 'workflow') score += 15;
      }
      if (q.includes('jpg') || q.includes('png') || q.includes('image to') || q.includes('photos to pdf')) {
        if (tool.id === 'images-to-pdf') score += 12;
        if (tool.id === 'pdf-to-images') score += 10;
      }

      return { tool, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.tool);
  };

  const matches = getMatchingTools(query);

  return (
    <div className="w-full bg-[#151923] border border-[#282D3A] rounded-2xl p-6 sm:p-8 space-y-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7DD3FC]">
        <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
        <span>Smart Tool Finder</span>
      </div>

      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Describe what you want to do with your document
        </h3>
        <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
          Our client-side intent analyzer matches your goal directly to the best browser-native tool.
        </p>
      </div>

      {/* Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 'I need to combine 3 invoices' or 'Make a photo scan searchable'..."
          className="w-full pl-11 pr-4 py-3 bg-[#0B0D12] border border-[#282D3A] rounded-xl text-sm text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
        />
      </div>

      {/* Quick click suggestions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-[#9CA3AF]">Suggestions:</span>
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setQuery(prompt)}
            className="text-xs px-2.5 py-1 bg-[#171329] hover:bg-[#282D3A] text-slate-300 rounded-md border border-[#282D3A] transition-colors cursor-pointer text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Results */}
      {matches.length > 0 && (
        <div className="pt-2 border-t border-[#282D3A] space-y-3">
          <p className="text-xs font-medium text-[#7DD3FC] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Recommended Tool Match:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matches.map((tool, index) => (
              <div
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  index === 0
                    ? 'bg-gradient-to-br from-[#171329] to-[#151923] border-[#8B5CF6]/50 shadow-[0_0_15px_rgba(139,92,246,0.12)]'
                    : 'bg-[#0B0D12] border-[#282D3A] hover:border-[#8B5CF6]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">{tool.name}</h4>
                    {index === 0 && (
                      <span className="text-[10px] font-mono text-[#8B5CF6] uppercase font-semibold">
                        Top Match
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2">{tool.description}</p>
                </div>

                <div className="mt-3 pt-2 flex items-center justify-between text-xs text-[#8B5CF6] font-medium">
                  <span>Launch Tool</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
