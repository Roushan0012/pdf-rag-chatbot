import React, { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import {
  Sparkles,
  BookOpen,
  Layers,
  Cpu,
  ArrowUpRight,
  Zap,
  ArrowDown,
  FileText,
  GitGraph,
  HelpCircle
} from 'lucide-react';

export default function ChatWindow({
  messages,
  activePdf,
  docInfo,
  onSuggestionClick,
  onLoadSample,
  onOpenPipeline,
  isUploading
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isScrolledUp);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative"
    >
      {messages.length === 0 ? (
        <div className="h-full min-h-[520px] flex flex-col items-center justify-center max-w-3xl mx-auto text-center py-6 px-4 animate-fade-in">
          {/* Glowing Hero Icon with Radial Glow */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600/40 via-cyan-500/30 to-purple-600/40 border border-indigo-500/40 flex items-center justify-center text-cyan-300 shadow-2xl shadow-indigo-500/30 backdrop-blur-2xl animate-pulse-glow">
              <Sparkles size={38} />
            </div>
            <div className="absolute -inset-3 bg-gradient-to-r from-indigo-500/30 via-cyan-500/30 to-purple-500/30 rounded-3xl blur-2xl -z-10" />
          </div>

          <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2.5">
            {activePdf ? (
              <span>
                Ready to explore <span className="text-gradient-accent">{activePdf}</span>
              </span>
            ) : (
              <span>
                Enterprise <span className="text-gradient-accent">PDF Intelligence</span>
              </span>
            )}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-8 leading-relaxed">
            {activePdf
              ? 'Ask deep domain questions, extract key metrics, or synthesize core concepts with multi-stage Parent-Child hybrid retrieval.'
              : 'Upload any research paper or document to automatically build hybrid BM25 + FAISS vector indexes with cross-encoder neural reranking.'}
          </p>

          {activePdf ? (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
              {[
                {
                  title: 'Executive Summary',
                  desc: 'Provide a structured high-level summary with bulleted takeaways.',
                  prompt: 'Please provide a comprehensive executive summary of this document with bulleted key takeaways.'
                },
                {
                  title: 'Key Insights & Facts',
                  desc: 'Extract main statistical findings, entities, and discoveries.',
                  prompt: 'What are the main insights, facts, and conclusions discussed in this document?'
                },
                {
                  title: 'Methodology & Architecture',
                  desc: 'Analyze the core algorithms, implementations, and techniques.',
                  prompt: 'Explain the methodologies, techniques, or algorithms outlined in this document.'
                },
                {
                  title: 'Actionable Takeaways',
                  desc: 'List concrete next steps and practical recommendations.',
                  prompt: 'List the actionable takeaways, recommendations, and next steps from this document.'
                }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(item.prompt)}
                  className="glass-card p-4 rounded-3xl text-left transition-all group flex flex-col justify-between hover:scale-[1.01]"
                >
                  <div>
                    <span className="font-heading font-semibold text-sm text-slate-100 group-hover:text-cyan-300 transition flex items-center justify-between">
                      {item.title}
                      <ArrowUpRight
                        size={16}
                        className="opacity-0 group-hover:opacity-100 transition text-cyan-400 -translate-x-1 group-hover:translate-x-0"
                      />
                    </span>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4 max-w-md w-full">
              <button
                onClick={onLoadSample}
                disabled={isUploading}
                className="w-full py-4 px-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2.5"
              >
                <Zap size={18} className="text-yellow-300 fill-yellow-300" />
                <span>Load Sample Research Paper (1-Click)</span>
              </button>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <button
                  onClick={onOpenPipeline}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-white/[0.06] hover:border-indigo-500/40 text-center transition"
                >
                  <Layers size={18} className="mx-auto text-indigo-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-300 block">Parent-Child</span>
                </button>
                <button
                  onClick={onOpenPipeline}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-white/[0.06] hover:border-cyan-500/40 text-center transition"
                >
                  <BookOpen size={18} className="mx-auto text-cyan-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-300 block">Hybrid Search</span>
                </button>
                <button
                  onClick={onOpenPipeline}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-white/[0.06] hover:border-purple-500/40 text-center transition"
                >
                  <Cpu size={18} className="mx-auto text-purple-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-300 block">Cross-Encoder</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6 pb-6">
          {messages.map((msg, index) => (
            <MessageBubble key={msg.id || index} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-28 right-8 p-3.5 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/50 border border-indigo-400/40 backdrop-blur-xl transition-all animate-fade-in hover:scale-110 z-20"
          title="Scroll to latest response"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
}
