import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Bot, Sparkles, BookOpen, Layers, Cpu, ArrowUpRight } from 'lucide-react';

export default function ChatWindow({ messages, activePdf, onSuggestionClick }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center py-10 px-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6 glow-subtle">
            <Sparkles size={32} />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2 tracking-tight">
            {activePdf ? `Ready to analyze "${activePdf}"` : 'Intelligent PDF RAG Assistant'}
          </h2>

          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
            {activePdf
              ? 'Ask specific questions, extract key takeaways, or explore detailed concepts with multi-stage Parent-Child hybrid retrieval.'
              : 'Upload a PDF from the sidebar to automatically parse pages, build hybrid vector indexes, and query with high precision.'}
          </p>

          {activePdf ? (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                {
                  title: 'Executive Summary',
                  desc: 'Provide a structured high-level summary of the entire document.',
                  prompt: 'Please provide a comprehensive executive summary of this document.'
                },
                {
                  title: 'Key Insights & Facts',
                  desc: 'Extract main statistical points, entities, and discoveries.',
                  prompt: 'What are the main insights, facts, and conclusions discussed?'
                },
                {
                  title: 'Methodology Analysis',
                  desc: 'Analyze core approaches, steps, and implementations.',
                  prompt: 'Explain the methodologies, techniques, or steps outlined in the document.'
                },
                {
                  title: 'Actionable Takeaways',
                  desc: 'List concrete next steps and practical recommendations.',
                  prompt: 'List the actionable takeaways and recommendations from this document.'
                }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(item.prompt)}
                  className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-400 transition flex items-center justify-between">
                      {item.title}
                      <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition text-blue-400" />
                    </span>
                    <p className="text-[11.5px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 w-full max-w-md pt-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <Layers size={18} className="mx-auto text-blue-400 mb-1" />
                <span className="text-[11px] font-medium text-slate-300 block">Parent-Child</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <BookOpen size={18} className="mx-auto text-purple-400 mb-1" />
                <span className="text-[11px] font-medium text-slate-300 block">Hybrid Search</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <Cpu size={18} className="mx-auto text-emerald-400 mb-1" />
                <span className="text-[11px] font-medium text-slate-300 block">Cross-Encoder</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <MessageBubble key={msg.id || index} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
