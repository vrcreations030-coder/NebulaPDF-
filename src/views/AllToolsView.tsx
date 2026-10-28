import React, { useState } from 'react';
import { ALL_TOOLS } from '../data/toolsData';
import type { ToolId, ToolCategory, PDFToolMeta } from '../types';
import {
  Search,
  ArrowRight,
  Sparkles,
  Layers,
  Scissors,
  RotateCw,
  FileImage,
  Images,
  Minimize2,
  ScanText,
  FileText,
  Stamp,
  Hash,
  PenTool,
  Eye,
  Columns2,
  Activity,
  CheckSquare,
  GitFork,
  FolderArchive,
  FileOutput,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';

interface AllToolsViewProps {
  onSelectTool: (toolId: ToolId) => void;
}

const getIcon = (name: string) => {
  switch (name) {
    case 'Layers': return <Layers className="w-5 h-5" />;
    case 'Scissors': return <Scissors className="w-5 h-5" />;
    case 'FileOutput': return <FileOutput className="w-5 h-5" />;
    case 'Trash2': return <Trash2 className="w-5 h-5" />;
    case 'ArrowUpDown': return <ArrowUpDown className="w-5 h-5" />;
    case 'RotateCw': return <RotateCw className="w-5 h-5" />;
    case 'FileImage': return <FileImage className="w-5 h-5" />;
    case 'Images': return <Images className="w-5 h-5" />;
    case 'ScanText': return <ScanText className="w-5 h-5" />;
    case 'Minimize2': return <Minimize2 className="w-5 h-5" />;
    case 'Stamp': return <Stamp className="w-5 h-5" />;
    case 'Hash': return <Hash className="w-5 h-5" />;
    case 'PenTool': return <PenTool className="w-5 h-5" />;
    case 'Eye': return <Eye className="w-5 h-5" />;
    case 'Columns2': return <Columns2 className="w-5 h-5" />;
    case 'Activity': return <Activity className="w-5 h-5" />;
    case 'CheckSquare': return <CheckSquare className="w-5 h-5" />;
    case 'Sparkles': return <Sparkles className="w-5 h-5" />;
    case 'GitFork': return <GitFork className="w-5 h-5" />;
    case 'FolderArchive': return <FolderArchive className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

export const AllToolsView: React.FC<AllToolsViewProps> = ({ onSelectTool }) => {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { id: ToolCategory; label: string }[] = [
    { id: 'all', label: 'All Tools' },
    { id: 'organize', label: 'Organize' },
    { id: 'convert', label: 'Convert' },
    { id: 'edit', label: 'Edit & Enhance' },
    { id: 'security-inspect', label: 'Security & Inspect' },
    { id: 'ai-smart', label: 'AI & Smart Workflows' },
  ];

  const filtered = ALL_TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          All PDF Tools
        </h1>
        <p className="text-sm text-[#9CA3AF] max-w-2xl leading-relaxed">
          Comprehensive, browser-local PDF utility suite. Every tool executes on your device without transmitting documents to third-party servers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-b border-[#282D3A] pb-6">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white bg-[#151923] border border-[#282D3A]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all tools..."
            className="w-full pl-10 pr-4 py-2 bg-[#151923] border border-[#282D3A] rounded-lg text-xs text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="group p-5 rounded-xl bg-[#151923] border border-[#282D3A] hover:border-[#8B5CF6]/50 hover:bg-[#171c28] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#171329] border border-[#282D3A] group-hover:border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6] transition-colors">
                  {getIcon(tool.icon)}
                </div>
                {tool.isNew && (
                  <span className="text-[10px] font-mono text-[#7DD3FC] uppercase tracking-wider font-semibold bg-[#7DD3FC]/10 px-2 py-0.5 rounded border border-[#7DD3FC]/20">
                    New
                  </span>
                )}
                {tool.isAI && (
                  <span className="text-[10px] font-mono text-[#8B5CF6] uppercase tracking-wider font-semibold bg-[#8B5CF6]/10 px-2 py-0.5 rounded border border-[#8B5CF6]/20">
                    AI Enabled
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base font-semibold text-white group-hover:text-[#7DD3FC] transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs font-medium text-slate-300 mt-0.5">{tool.tagline}</p>
                <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed line-clamp-3">
                  {tool.description}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#282D3A]/60 flex items-center justify-between text-xs text-[#8B5CF6] font-medium group-hover:translate-x-1 transition-transform">
              <span>Launch Tool</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center rounded-xl bg-[#151923] border border-[#282D3A] text-xs text-[#9CA3AF]">
          No tools match "{searchQuery}". Try searching for "merge", "split", "convert", or "compress".
        </div>
      )}
    </div>
  );
};
