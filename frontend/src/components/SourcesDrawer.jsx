import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Search,
  FileText,
  ExternalLink
} from 'lucide-react';

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
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Sparkles size={10} /> Hybrid Fusion
          </span>
        );
      case 'dense_faiss':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <Search size={10} /> Dense FAISS
          </span>
        );
      case 'sparse_bm25':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <BookOpen size={10} /> Sparse BM25
          </span>
        );
      default:
        return null;
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 80) {
      return {
        bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
        bar: 'bg-emerald-400'
      };
    }
    if (score >= 50) {
      return {
        bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
        bar: 'bg-cyan-400'
      };
    }
    return {
      bg: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
      bar: 'bg-slate-400'
    };
  };

  return (
    <div className="mt-3.5 border-t border-white/[0.08] pt-2.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1.5 px-2.5 rounded-xl hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-2 font-medium">
          <Layers size={14} className="text-cyan-400" />
          <span>Retrieved Evidence ({sources.length} Reranked Passages)</span>
          <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-mono">
            Cross-Encoder
          </span>
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {/* Toggle between Child Chunk match and Parent Context */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-400 text-[11px]">Context resolution mode:</span>
            <div className="flex bg-slate-950/80 p-0.5 rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setActiveTab('child')}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeTab === 'child'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Child Matches (~300 chars)
              </button>
              <button
                onClick={() => setActiveTab('parent')}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeTab === 'parent'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full Parent Context (~1200 chars)
              </button>
            </div>
          </div>

          {sources.map((src, index) => {
            const displayContent =
              activeTab === 'parent' ? src.parentContent || src.childContent : src.childContent;
            const scoreStyle = getScoreBadge(src.relevancePercentage);

            return (
              <div
                key={src.id || index}
                className="p-3.5 rounded-2xl bg-slate-950/75 border border-white/[0.06] hover:border-indigo-500/30 transition-all text-xs text-slate-300 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-bold text-[11px]">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <FileText size={12} className="text-indigo-400" />
                      Page {src.page}
                    </span>
                    {getMethodBadge(src.retrievalMethod)}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono border ${scoreStyle.bg}`}
                      title={`Cross-Encoder Logit Score: ${src.rerankScore}`}
                    >
                      {src.relevancePercentage}% Relevance
                    </span>

                    <button
                      onClick={() => handleCopy(displayContent, src.id || index)}
                      className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/[0.08] transition"
                      title="Copy chunk text"
                    >
                      {copiedId === (src.id || index) ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="font-mono text-[11.5px] leading-relaxed text-slate-300 whitespace-pre-wrap bg-slate-900/90 p-3 rounded-xl border border-white/[0.04] overflow-x-auto max-h-48 overflow-y-auto">
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
