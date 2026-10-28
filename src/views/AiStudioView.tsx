import React, { useState, useEffect, useRef } from 'react';
import { DropZone, type UploadedPDFFile } from '../components/DropZone';
import { ConsentModal } from '../components/ConsentModal';
import {
  extractAllText,
  loadPdfJsDoc,
  ensureFreshBuffer,
} from '../services/pdfEngine';
import {
  generateLocalSummary,
  extractLocalEntities,
  generateLocalStudyKit,
  BrowserAudioNarrator,
} from '../services/aiService';
import type { ExtractedPageText } from '../types';
import {
  Sparkles,
  ArrowLeft,
  MessageSquare,
  FileText,
  Calendar,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Send,
  HelpCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AiStudioViewProps {
  onBack: () => void;
  sharedFiles: UploadedPDFFile[];
  onAddSharedFiles: (files: UploadedPDFFile[]) => void;
}

type StudioTab = 'summary' | 'chat' | 'entities' | 'study' | 'search' | 'audio';

export const AiStudioView: React.FC<AiStudioViewProps> = ({
  onBack,
  sharedFiles,
  onAddSharedFiles,
}) => {
  const [currentFile, setCurrentFile] = useState<UploadedPDFFile | null>(
    sharedFiles.length > 0 ? sharedFiles[0] : null
  );
  const [activeTab, setActiveTab] = useState<StudioTab>('summary');
  const [pagesText, setPagesText] = useState<ExtractedPageText[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Configuration Status
  const [providerStatus, setProviderStatus] = useState<'Local' | 'Configured' | 'Requires Setup'>('Local');

  // Summary State
  const [summary, setSummary] = useState<string>('');

  // Entities State
  const [entities, setEntities] = useState<{
    dates: string[];
    monetary: string[];
    names: string[];
    actionItems: string[];
  } | null>(null);

  // Study Kit State
  const [studyKit, setStudyKit] = useState<{
    quiz: Array<{ question: string; options: string[]; correctIndex: number; explanation: string }>;
    flashcards: Array<{ front: string; back: string }>;
  } | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [flippedCard, setFlippedCard] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  // Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; page?: number }>>([
    {
      sender: 'assistant',
      text: 'Hello! I am your NebulaPDF document companion. Ask me any question about your document, or request key takeaways.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);

  // Smart Page Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Audio State
  const narratorRef = useRef<BrowserAudioNarrator | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  // Consent Modal State
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingSnippet, setPendingSnippet] = useState('');
  const [consentAction, setConsentAction] = useState<(() => void) | null>(null);

  // Initialize Audio Narrator
  useEffect(() => {
    narratorRef.current = new BrowserAudioNarrator();
    return () => {
      narratorRef.current?.stop();
    };
  }, []);

  // Check if server-side AI proxy is reachable
  useEffect(() => {
    fetch('/api/ai/health')
      .then((res) => {
        if (res.ok) setProviderStatus('Configured');
        else setProviderStatus('Local');
      })
      .catch(() => setProviderStatus('Local'));
  }, []);

  // Extract document text when current file changes
  useEffect(() => {
    if (!currentFile) {
      setPagesText([]);
      setSummary('');
      setEntities(null);
      setStudyKit(null);
      return;
    }

    setIsExtracting(true);
    setError(null);

    ensureFreshBuffer(currentFile)
      .then((buf) => extractAllText(buf))
      .then((extracted) => {
        setPagesText(extracted);
        // Automatically compute local analysis
        const localSum = generateLocalSummary(extracted);
        setSummary(localSum);

        const ent = extractLocalEntities(extracted);
        setEntities(ent);

        const kit = generateLocalStudyKit(extracted);
        setStudyKit(kit);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to extract text from document');
      })
      .finally(() => {
        setIsExtracting(false);
      });
  }, [currentFile]);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      const f = files[0];
      const buffer = await f.arrayBuffer();
      const doc = await loadPdfJsDoc(buffer);
      const uploaded: UploadedPDFFile = { file: f, buffer, pageCount: doc.numPages };
      setCurrentFile(uploaded);
      onAddSharedFiles([uploaded]);
    } catch (err: any) {
      setError(err?.message || 'Failed to open PDF');
    }
  };

  // Chat handler with grounding in extracted text
  const handleSendMessage = () => {
    if (!chatInput.trim() || isChatThinking) return;
    const query = chatInput.trim();
    setChatInput('');

    setChatMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setIsChatThinking(true);

    setTimeout(() => {
      // Find pages containing query keywords
      const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      let bestPage = 1;
      let highestMatches = 0;
      let matchedSentence = '';

      for (const p of pagesText) {
        let matchCount = 0;
        const pLower = p.text.toLowerCase();
        for (const w of qWords) {
          if (pLower.includes(w)) matchCount++;
        }
        if (matchCount > highestMatches) {
          highestMatches = matchCount;
          bestPage = p.pageNumber;
          // grab sentence
          const sentences = p.text.split(/[.?!]\s+/);
          for (const s of sentences) {
            if (qWords.some((w) => s.toLowerCase().includes(w))) {
              matchedSentence = s.trim();
              break;
            }
          }
        }
      }

      let reply = '';
      if (highestMatches > 0 && matchedSentence) {
        reply = `Based on page ${bestPage}: "${matchedSentence}."`;
      } else if (pagesText.length > 0) {
        reply = `I searched through the document text across ${pagesText.length} pages, but could not find a direct citation matching "${query}". Check the Smart Page Finder or rephrase your term.`;
      } else {
        reply = 'No readable text was found in this document.';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: reply,
          page: highestMatches > 0 ? bestPage : undefined,
        },
      ]);
      setIsChatThinking(false);
    }, 600);
  };

  // Speech narration
  const handleToggleSpeak = () => {
    if (!narratorRef.current) return;
    if (isSpeaking && !isPaused) {
      narratorRef.current.pause();
      setIsPaused(true);
    } else if (isSpeaking && isPaused) {
      narratorRef.current.resume();
      setIsPaused(false);
    } else {
      const fullContent = summary || pagesText.map((p) => p.text).join(' ');
      if (!fullContent) return;
      narratorRef.current.speak(fullContent, {
        rate: speechRate,
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
      });
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const handleStopSpeak = () => {
    narratorRef.current?.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  // Matching search results with exact citations
  const searchResults = searchQuery.trim()
    ? pagesText
        .map((p) => {
          const idx = p.text.toLowerCase().indexOf(searchQuery.toLowerCase());
          if (idx === -1) return null;
          const snippetStart = Math.max(0, idx - 60);
          const snippetEnd = Math.min(p.text.length, idx + 120);
          return {
            pageNumber: p.pageNumber,
            snippet: p.text.substring(snippetStart, snippetEnd),
          };
        })
        .filter(Boolean) as Array<{ pageNumber: number; snippet: string }>
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tools</span>
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
            <Sparkles className="w-4 h-4" />
            <span>Document Intelligence</span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Engine: {providerStatus}</span>
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI PDF Studio</h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Grounded document analysis: instant summaries, entity extraction, flashcard study kits, search citations, and speech narration.
        </p>
      </div>

      {!currentFile ? (
        <DropZone
          onFilesSelected={handleFile}
          title="Upload PDF to launch AI analysis"
          description="Analyzed in local browser memory with optional Cloudflare AI Proxy."
        />
      ) : (
        <div className="space-y-6">
          {/* Active File Bar */}
          <div className="p-4 rounded-xl bg-[#151923] border border-[#282D3A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#171329] border border-[#282D3A] flex items-center justify-center text-[#8B5CF6]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">{currentFile.file.name}</p>
                <p className="text-[#9CA3AF] font-mono">
                  {pagesText.length} pages · {Math.round(currentFile.file.size / 1024)} KB
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setCurrentFile(null);
                setPagesText([]);
              }}
              className="px-3 py-1.5 text-slate-300 hover:text-white bg-[#0B0D12] border border-[#282D3A] rounded-lg cursor-pointer"
            >
              Change Document
            </button>
          </div>

          {/* Studio Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#282D3A]">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === 'summary'
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white bg-[#151923] border border-[#282D3A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Summary</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === 'chat'
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white bg-[#151923] border border-[#282D3A]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat with PDF</span>
            </button>

            <button
              onClick={() => setActiveTab('entities')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === 'entities'
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white bg-[#151923] border border-[#282D3A]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Dates & Actions</span>
            </button>

            <button
              onClick={() => setActiveTab('study')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === 'study'
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white bg-[#151923] border border-[#282D3A]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Study Mode</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === 'search'
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white bg-[#151923] border border-[#282D3A]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Page Finder</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === 'audio'
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white bg-[#151923] border border-[#282D3A]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio Notes</span>
            </button>
          </div>

          {/* Loading Indicator */}
          {isExtracting && (
            <div className="p-12 text-center rounded-2xl bg-[#151923] border border-[#282D3A] space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6] mx-auto" />
              <p className="text-xs text-[#9CA3AF]">Parsing document text layers...</p>
            </div>
          )}

          {/* TAB 1: SUMMARY */}
          {!isExtracting && activeTab === 'summary' && (
            <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#282D3A]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#7DD3FC]" />
                  Executive Document Summary
                </h3>
                <span className="text-[11px] font-mono text-emerald-400">
                  Computed via local extractive frequency scoring
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A] text-xs text-slate-200 leading-relaxed font-sans space-y-3">
                <p>{summary || 'No text could be extracted to generate a summary.'}</p>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>Grounded strictly in verified sentences from your document.</span>
                <button
                  onClick={() => {
                    setPendingSnippet(summary);
                    setConsentAction(() => () => {});
                    setConsentOpen(true);
                  }}
                  className="text-xs text-[#8B5CF6] hover:text-[#a78bfa] underline cursor-pointer"
                >
                  Request External AI Polish (Consent Required)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CHAT WITH PDF */}
          {!isExtracting && activeTab === 'chat' && (
            <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#8B5CF6] text-white rounded-br-xs'
                          : 'bg-[#0B0D12] border border-[#282D3A] text-slate-200 rounded-bl-xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {msg.page && (
                        <p className="mt-1.5 pt-1.5 border-t border-[#282D3A] text-[10px] font-mono text-[#7DD3FC]">
                          Citation: Grounded on Page {msg.page}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {isChatThinking && (
                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF] p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                    <span>Cross-referencing document text...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="pt-2 border-t border-[#282D3A] flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a question about this PDF..."
                  className="flex-1 px-4 py-2.5 bg-[#0B0D12] border border-[#282D3A] rounded-xl text-xs text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isChatThinking}
                  className="px-4 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 text-white rounded-xl cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DATES & ACTIONS */}
          {!isExtracting && activeTab === 'entities' && (
            <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#7DD3FC]" />
                Extracted Dates, Monetary Figures & Action Items
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Dates */}
                <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-2">
                  <span className="font-semibold text-[#8B5CF6] uppercase tracking-wider block">
                    Dates & Deadlines ({entities?.dates.length || 0})
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {entities?.dates.map((d, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-[#151923] text-slate-200 font-mono">
                        {d}
                      </div>
                    ))}
                    {(!entities || entities.dates.length === 0) && (
                      <span className="text-slate-500 italic">No standard dates detected.</span>
                    )}
                  </div>
                </div>

                {/* Monetary values */}
                <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-2">
                  <span className="font-semibold text-emerald-400 uppercase tracking-wider block">
                    Monetary & Values ({entities?.monetary.length || 0})
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {entities?.monetary.map((m, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-[#151923] text-slate-200 font-mono">
                        {m}
                      </div>
                    ))}
                    {(!entities || entities.monetary.length === 0) && (
                      <span className="text-slate-500 italic">No currency amounts detected.</span>
                    )}
                  </div>
                </div>

                {/* Action Items */}
                <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-2 md:col-span-2">
                  <span className="font-semibold text-[#7DD3FC] uppercase tracking-wider block">
                    Critical Clauses & Action Obligations ({entities?.actionItems.length || 0})
                  </span>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {entities?.actionItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-[#151923] border border-[#282D3A]/60 text-slate-200">
                        {item}
                      </div>
                    ))}
                    {(!entities || entities.actionItems.length === 0) && (
                      <span className="text-slate-500 italic">No explicit action triggers found.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STUDY MODE */}
          {!isExtracting && activeTab === 'study' && (
            <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#8B5CF6]" />
                Interactive Document Study Kit
              </h3>

              {/* Flashcards */}
              {studyKit?.flashcards && studyKit.flashcards.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                    <span className="font-semibold text-white">
                      Concept Flashcards ({activeCardIndex + 1} of {studyKit.flashcards.length})
                    </span>
                    <span>Click card to reveal answer</span>
                  </div>

                  <div
                    onClick={() => setFlippedCard(!flippedCard)}
                    className="p-8 rounded-2xl bg-[#0B0D12] border border-[#8B5CF6]/50 min-h-[160px] flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-[#8B5CF6] shadow-md select-none"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#7DD3FC] mb-2">
                      {flippedCard ? 'Answer / Concept Explanation' : 'Question Prompt'}
                    </span>
                    <p className="text-sm sm:text-base font-medium text-white max-w-lg leading-relaxed">
                      {flippedCard
                        ? studyKit.flashcards[activeCardIndex].back
                        : studyKit.flashcards[activeCardIndex].front}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        setFlippedCard(false);
                        setActiveCardIndex((i) => Math.max(0, i - 1));
                      }}
                      disabled={activeCardIndex === 0}
                      className="px-3 py-1.5 text-xs bg-[#0B0D12] border border-[#282D3A] text-slate-300 rounded hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      Previous Card
                    </button>
                    <button
                      onClick={() => {
                        setFlippedCard(false);
                        setActiveCardIndex((i) => Math.min(studyKit.flashcards.length - 1, i + 1));
                      }}
                      disabled={activeCardIndex === studyKit.flashcards.length - 1}
                      className="px-3 py-1.5 text-xs bg-[#0B0D12] border border-[#282D3A] text-slate-300 rounded hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      Next Card
                    </button>
                  </div>
                </div>
              )}

              {/* Multiple Choice Quiz */}
              {studyKit?.quiz && studyKit.quiz.length > 0 && (
                <div className="pt-4 border-t border-[#282D3A] space-y-4">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Self-Assessment Quiz
                  </h4>

                  <div className="space-y-4">
                    {studyKit.quiz.map((q, qIndex) => {
                      const selected = quizAnswers[qIndex];
                      return (
                        <div key={qIndex} className="p-4 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-3">
                          <p className="text-xs font-medium text-white">{q.question}</p>
                          <div className="space-y-2">
                            {q.options.map((opt, optIndex) => {
                              const isChosen = selected === optIndex;
                              const isCorrect = optIndex === q.correctIndex;
                              const showFeedback = selected !== undefined;

                              return (
                                <button
                                  key={optIndex}
                                  onClick={() => setQuizAnswers((prev) => ({ ...prev, [qIndex]: optIndex }))}
                                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer border ${
                                    showFeedback
                                      ? isCorrect
                                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200'
                                        : isChosen
                                        ? 'bg-rose-950/40 border-rose-600 text-rose-200'
                                        : 'bg-[#151923] border-[#282D3A] text-slate-400'
                                      : 'bg-[#151923] border-[#282D3A] text-slate-300 hover:border-[#8B5CF6]'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {showFeedback && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                          {selected !== undefined && (
                            <p className="text-[11px] text-[#9CA3AF] pt-1">
                              <strong>Note:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SMART PAGE FINDER */}
          {!isExtracting && activeTab === 'search' && (
            <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#7DD3FC]" />
                Smart Page Finder with Citations
              </h3>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter keyword or concept to jump to exact page citation..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0B0D12] border border-[#282D3A] rounded-xl text-xs text-white placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {searchQuery.trim() && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-[#9CA3AF]">
                    Found {searchResults.length} matching page{searchResults.length !== 1 ? 's' : ''}:
                  </p>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {searchResults.map((res, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-[#0B0D12] border border-[#282D3A] space-y-1 text-xs">
                        <span className="font-mono font-bold text-[#8B5CF6]">Page {res.pageNumber}</span>
                        <p className="text-slate-300 font-mono leading-relaxed">
                          "...{res.snippet}..."
                        </p>
                      </div>
                    ))}
                    {searchResults.length === 0 && (
                      <p className="text-xs text-slate-500 italic p-4 text-center">
                        No matches found for "{searchQuery}".
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AUDIO NOTES */}
          {!isExtracting && activeTab === 'audio' && (
            <div className="p-6 rounded-2xl bg-[#151923] border border-[#282D3A] space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#7DD3FC]" />
                Browser Text-to-Speech Player
              </h3>

              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Listen to your document summary hands-free. Uses your native browser SpeechSynthesis engine with zero cloud audio API calls.
              </p>

              {/* Audio Controls Box */}
              <div className="p-6 rounded-2xl bg-[#0B0D12] border border-[#282D3A] flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleSpeak}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] text-white flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20 transition-all cursor-pointer"
                  >
                    {isSpeaking && !isPaused ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  <div>
                    <p className="text-xs font-semibold text-white">
                      {isSpeaking ? (isPaused ? 'Paused' : 'Playing Speech...') : 'Ready to Narrate'}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {summary ? 'Executive Summary Audio' : 'Document Audio'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <button
                    onClick={handleStopSpeak}
                    disabled={!isSpeaking}
                    className="p-2 text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Stop"
                  >
                    <VolumeX className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-[#9CA3AF]">Speed:</span>
                    {([0.9, 1.0, 1.25] as const).map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setSpeechRate(rate)}
                        className={`px-2 py-1 rounded text-xs font-mono cursor-pointer ${
                          speechRate === rate
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#151923] text-[#9CA3AF] hover:text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consent Modal for optional external polish */}
      <ConsentModal
        isOpen={consentOpen}
        textSnippet={pendingSnippet}
        onConfirm={() => {
          setConsentOpen(false);
          consentAction?.();
        }}
        onCancel={() => setConsentOpen(false)}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
