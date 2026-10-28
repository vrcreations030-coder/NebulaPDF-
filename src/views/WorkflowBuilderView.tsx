import React, { useState } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import {
  mergePdfs,
  rotatePdf,
  addPageNumbers,
  addWatermark,
  compressPdf,
  downloadBlob,
  loadPdfJsDoc,
  ensureFreshBuffer,
} from '../services/pdfEngine';
import {
  GitFork,
  ArrowLeft,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Plus,
  Trash2,
  Layers,
  RotateCw,
  Hash,
  Stamp,
  Minimize2,
} from 'lucide-react';

interface WorkflowBuilderViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
}

type WorkflowStepType = 'merge' | 'rotate' | 'page-numbers' | 'watermark' | 'compress';

interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  title: string;
  config?: any;
}

export const WorkflowBuilderView: React.FC<WorkflowBuilderViewProps> = ({ onBack, sharedFiles }) => {
  const [inputFiles, setInputFiles] = useState<UploadedPDFFile[]>(sharedFiles);
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: '1', type: 'rotate', title: 'Rotate Pages (+90°)', config: { degrees: 90 } },
    { id: '2', type: 'page-numbers', title: 'Stamp Page Numbers', config: { format: 'Page X of Y' } },
    { id: '3', type: 'compress', title: 'Compact Object Streams' },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableStepOptions: { type: WorkflowStepType; label: string; icon: any }[] = [
    { type: 'rotate', label: 'Rotate Pages (90°)', icon: RotateCw },
    { type: 'page-numbers', label: 'Add Page Numbers', icon: Hash },
    { type: 'watermark', label: 'Stamp Watermark', icon: Stamp },
    { type: 'compress', label: 'Compress PDF', icon: Minimize2 },
  ];

  const addStep = (type: WorkflowStepType) => {
    const meta = availableStepOptions.find((o) => o.type === type);
    setSteps((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        type,
        title: meta?.label || 'Processing Step',
      },
    ]);
  };

  const removeStep = (index: number) => {
    const updated = [...steps];
    updated.splice(index, 1);
    setSteps(updated);
  };

  const handleFiles = async (files: File[]) => {
    const added: UploadedPDFFile[] = [];
    for (const f of files) {
      try {
        const buffer = await f.arrayBuffer();
        const doc = await loadPdfJsDoc(buffer);
        added.push({ file: f, buffer, pageCount: doc.numPages });
      } catch {}
    }
    setInputFiles((prev) => [...prev, ...added]);
  };

  const executePipeline = async () => {
    if (inputFiles.length === 0) {
      setError('Please upload at least one document to process.');
      return;
    }
    if (steps.length === 0) {
      setError('Please add at least one step to the workflow.');
      return;
    }

    setError(null);
    setIsRunning(true);
    setResultBytes(null);

    try {
      const safeBuffers = await Promise.all(inputFiles.map((f) => ensureFreshBuffer(f)));
      let currentBuffer: ArrayBuffer = safeBuffers[0];

      // If multiple files and first step is merge, or auto merge
      if (safeBuffers.length > 1) {
        const merged = await mergePdfs(safeBuffers);
        currentBuffer = (merged.buffer as ArrayBuffer).slice(0);
      }

      for (let i = 0; i < steps.length; i++) {
        setCurrentStepIndex(i);
        const step = steps[i];

        if (step.type === 'rotate') {
          const rotationMap: Record<number, number> = {};
          const doc = await loadPdfJsDoc(currentBuffer);
          for (let p = 1; p <= doc.numPages; p++) rotationMap[p] = 90;
          const rotated = await rotatePdf(currentBuffer, rotationMap);
          currentBuffer = (rotated.buffer as ArrayBuffer).slice(0);
        } else if (step.type === 'page-numbers') {
          const numbered = await addPageNumbers(currentBuffer, { position: 'bottom-center' });
          currentBuffer = (numbered.buffer as ArrayBuffer).slice(0);
        } else if (step.type === 'watermark') {
          const marked = await addWatermark(currentBuffer, { text: 'PROCESSED' });
          currentBuffer = (marked.buffer as ArrayBuffer).slice(0);
        } else if (step.type === 'compress') {
          const comp = await compressPdf(currentBuffer);
          currentBuffer = (comp.data.buffer as ArrayBuffer).slice(0);
        }
      }

      setResultBytes(new Uint8Array(currentBuffer));
    } catch (err: any) {
      setError(err?.message || 'Workflow pipeline execution failed.');
    } finally {
      setIsRunning(false);
      setCurrentStepIndex(null);
    }
  };

  const handleDownload = () => {
    if (!resultBytes) return;
    downloadBlob(resultBytes, 'nebula_workflow_output.pdf');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tools</span>
      </button>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
          <GitFork className="w-4 h-4" />
          <span>Sequential Automation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Workflow Builder</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Chain multiple PDF operations in a single verifiable execution pipeline.
        </p>
      </div>

      {/* Input File Box */}
      <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Pipeline Source Files ({inputFiles.length})</span>
          {inputFiles.length > 0 && (
            <button onClick={() => setInputFiles([])} className="text-rose-400 hover:text-rose-300 cursor-pointer">
              Clear Files
            </button>
          )}
        </div>

        {inputFiles.length === 0 ? (
          <DropZone onFilesSelected={handleFiles} multiple title="Select Documents for Pipeline" />
        ) : (
          <div className="space-y-1.5">
            {inputFiles.map((f, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#282D3A] text-xs flex justify-between">
                <span className="text-white font-medium truncate">{f.file.name}</span>
                <span className="text-[#9CA3AF] font-mono">{f.pageCount} pages</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step Sequence Configuration */}
      <div className="p-5 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Automated Step Pipeline ({steps.length})</span>
          <span className="text-[#9CA3AF]">Executed sequentially in browser</span>
        </div>

        <div className="space-y-2">
          {steps.map((step, idx) => {
            const isCurrent = currentStepIndex === idx;
            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  isCurrent
                    ? 'bg-[#171329] border-[#8B5CF6]'
                    : 'bg-[#0B0D12] border-[#282D3A]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#151923] border border-[#282D3A] flex items-center justify-center font-mono font-bold text-[#8B5CF6]">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-white">{step.title}</span>
                  {isCurrent && (
                    <span className="text-[10px] text-[#7DD3FC] flex items-center gap-1 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" /> Running...
                    </span>
                  )}
                </div>

                <button
                  onClick={() => removeStep(idx)}
                  className="p-1 text-[#9CA3AF] hover:text-rose-400 cursor-pointer"
                  title="Remove step"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Step Toolbar */}
        <div className="pt-3 border-t border-[#282D3A] flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#9CA3AF]">Add Next Action:</span>
          {availableStepOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => addStep(opt.type)}
              className="px-2.5 py-1 bg-[#0B0D12] hover:bg-[#171329] border border-[#282D3A] text-slate-300 hover:text-white rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3 text-[#8B5CF6]" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-[#282D3A] flex justify-end">
          <button
            onClick={executePipeline}
            disabled={isRunning || inputFiles.length === 0}
            className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] disabled:opacity-40 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Pipeline Step {currentStepIndex !== null ? currentStepIndex + 1 : ''}...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Automated Workflow</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Output */}
      {resultBytes && (
        <div className="p-5 rounded-2xl bg-[#171329] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pipeline Execution Completed!</h3>
              <p className="text-xs text-[#9CA3AF]">
                All {steps.length} sequential operations applied successfully ({Math.round(resultBytes.byteLength / 1024)} KB).
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <Download className="w-4 h-4" />
            <span>Download Pipeline Output</span>
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
