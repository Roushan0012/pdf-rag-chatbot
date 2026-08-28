import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Copy, Check, Sparkles, BookOpen, Search } from 'lucide-react';

export default function SourcesDrawer({ sources }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('child'); // 'child' or 'parent'
  const [copiedId, setCopiedId] = useState(null);

  if (!sources || sources.length === 0) return null;

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodBadge = (method) => {
    switch (method) {
      case 'hybrid':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Sparkles size={11} /> Hybrid (FAISS + BM25)
          </span>
        );
      case 'dense_faiss':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <Search size={11} /> Dense FAISS
          </span>
        );
      case 'sparse_bm25':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <BookOpen size={11} /> Sparse BM25
          </span>
        );
      default:
        return null;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 50) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  };

  return (
    <div className="mt-3 border-t border-slate-800/80 pt-2.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-blue-400 transition-colors py-1 px-2 rounded-md hover:bg-slate-800/40"
      >
        <div className="flex items-center gap-2 font-medium">
          <Layers size={14} className="text-blue-400" />
          <span>Retrieved Context ({sources.length} Reranked Chunks)</span>
          <span className="px-1.5 py-0.2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px]">
            Top 5 Cross-Encoder
          </span>
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2.5 animate-fade-in">
          {/* Tab switch between child and parent view */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-400 text-[11px]">Toggle context view:</span>
            <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('child')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'child'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Child Chunks (Search Matches)
              </button>
              <button
                onClick={() => setActiveTab('parent')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'parent'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Parent Context (Fed to LLM)
              </button>
            </div>
          </div>

          {sources.map((src, index) => {
            const displayContent = activeTab === 'parent' ? (src.parentContent || src.childContent) : src.childContent;
            
            return (
              <div
                key={src.id || index}
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors text-xs text-slate-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold text-[11px]">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-slate-200">
                      Page {src.page}
                    </span>
                    {getMethodBadge(src.retrievalMethod)}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${getScoreColor(
                        src.relevancePercentage
                      )}`}
                      title={`Cross-Encoder Logit Score: ${src.rerankScore}`}
                    >
                      {src.relevancePercentage}% Relevance
                    </span>

                    <button
                      onClick={() => handleCopy(displayContent, src.id || index)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                      title="Copy chunk content"
                    >
                      {copiedId === (src.id || index) ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="font-mono text-[11.5px] leading-relaxed text-slate-300 whitespace-pre-wrap bg-slate-950/60 p-2.5 rounded border border-slate-900 overflow-x-auto max-h-48 overflow-y-auto">
                  {displayContent}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
