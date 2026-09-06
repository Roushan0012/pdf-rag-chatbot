import React, { useState } from 'react';
import {
  X,
  Layers,
  Database,
  Cpu,
  Zap,
  Sparkles,
  ArrowRight,
  GitMerge,
  Filter,
  FileText,
  Search,
  CheckCircle2,
  Sliders,
  Maximize2
} from 'lucide-react';

export default function PipelineVisualizer({ isOpen, onClose, docInfo, ragParams }) {
  const [selectedNode, setSelectedNode] = useState('hybrid');

  if (!isOpen) return null;

  const NODES = [
    {
      id: 'ingestion',
      title: '1. Ingestion & Splitting',
      badge: 'Parent-Child',
      icon: Layers,
      color: 'text-indigo-400',
      border: 'border-indigo-500/40',
      bg: 'bg-indigo-500/10',
      glow: 'glow-indigo',
      details: {
        heading: 'Decoupled Parent-Child Chunking',
        stats: [
          { label: 'Parent Chunk Size', val: '1200 chars (with 150 overlap)' },
          { label: 'Child Chunk Size', val: '300 chars (with 50 overlap)' },
          { label: 'Ingested Document', val: docInfo?.filename || 'sample_rag_paper.pdf' },
          { label: 'Parent Chunks', val: `${docInfo?.parentChunks || 1} high-context blocks` },
          { label: 'Child Chunks', val: `${docInfo?.childChunks || 2} search vectors` },
        ],
        desc: 'Traditional RAG forces a trade-off: small chunks lose surrounding semantic context, while large chunks dilute embeddings. NexusRAG solves this by embedding small child chunks for surgical retrieval precision, then substituting their full parent chunk when prompting the LLM.'
      }
    },
    {
      id: 'dual_index',
      title: '2. Dual Index Storage',
      badge: 'FAISS + BM25',
      icon: Database,
      color: 'text-cyan-400',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-500/10',
      glow: 'glow-cyan',
      details: {
        heading: 'Dense Semantic & Sparse Lexical Indexing',
        stats: [
          { label: 'Dense Vector DB', val: 'FAISS (all-MiniLM-L6-v2, 384-dim)' },
          { label: 'Sparse Search', val: 'BM25 Okapi (Term Frequency / IDF)' },
          { label: 'Index Target', val: 'Child Chunks (~300 chars)' },
          { label: 'Normalization', val: 'L2 Unit Spherical Projection' }
        ],
        desc: 'Dense embeddings capture abstract semantics, synonyms, and paraphrasing. Sparse BM25 matches exact keywords, acronyms, product numbers, and technical jargon. Storing both guarantees comprehensive candidate recall.'
      }
    },
    {
      id: 'hybrid',
      title: '3. Hybrid RRF Fusion',
      badge: 'Reciprocal Rank',
      icon: GitMerge,
      color: 'text-purple-400',
      border: 'border-purple-500/40',
      bg: 'bg-purple-500/10',
      glow: 'glow-purple',
      details: {
        heading: 'Reciprocal Rank Fusion (RRF)',
        stats: [
          { label: 'Candidate Retrieval Depth', val: `Top-${ragParams?.topK || 15} Passages` },
          { label: 'Fusion Formula', val: 'RRF(d) = Σ [1 / (k + rank(d))]' },
          { label: 'Smoothing Constant (k)', val: '60' },
          { label: 'Dense Weight', val: '0.50' },
          { label: 'Sparse Weight', val: '0.50' }
        ],
        desc: 'RRF normalizes and fuses dissimilar score distributions from FAISS cosine similarity and BM25 scores without requiring manual threshold tuning, producing a calibrated top candidate list.'
      }
    },
    {
      id: 'reranker',
      title: '4. Cross-Encoder Rerank',
      badge: 'ms-marco Neural',
      icon: Cpu,
      color: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      glow: 'glow-emerald',
      details: {
        heading: 'Cross-Attention Neural Reranking',
        stats: [
          { label: 'Cross-Encoder Model', val: 'cross-encoder/ms-marco-MiniLM-L-6-v2' },
          { label: 'Candidate Pool Filter', val: `Top-${ragParams?.topK || 15} → Top-${ragParams?.topN || 5}` },
          { label: 'Scoring Mechanism', val: 'Joint Query-Passage Cross-Attention' },
          { label: 'Probability Mapping', val: 'Sigmoid Normalization (0-100%)' }
        ],
        desc: 'Bi-encoders encode queries and passages independently, missing inter-token cross-attention. Our Cross-Encoder processes the query and passage simultaneously through full self-attention layers, eliminating false positives.'
      }
    },
    {
      id: 'generation',
      title: '5. Groq LLM Inference',
      badge: 'Sub-Second Stream',
      icon: Zap,
      color: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
      glow: 'glow-emerald',
      details: {
        heading: 'Ultra-Fast Token Streaming',
        stats: [
          { label: 'Engine Acceleration', val: 'Groq Tensor Streaming Processor (LPU)' },
          { label: 'Model Architecture', val: 'GPT-OSS-120B / 20B Versatile' },
          { label: 'Sampling Temperature', val: `${ragParams?.temperature || 0.1}` },
          { label: 'Citation Anchoring', val: 'Strict Document Grounding' }
        ],
        desc: 'The top reranked parent documents are assembled into high-density context and streamed token-by-token directly to your browser with sub-second time-to-first-token (TTFT).'
      }
    }
  ];

  const activeNodeData = NODES.find((n) => n.id === selectedNode) || NODES[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#080d1d] border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Topbar */}
        <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                Interactive RAG Architecture Graph
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                  Live Visualizer
                </span>
              </h2>
              <p className="text-xs text-slate-400">Click any stage node to inspect deep telemetry and algorithmic details</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Node Flow Diagram Strip */}
        <div className="p-4 sm:p-6 bg-slate-950/40 border-b border-white/[0.06] overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] gap-2">
            {NODES.map((node, idx) => {
              const Icon = node.icon;
              const isSelected = selectedNode === node.id;
              return (
                <React.Fragment key={node.id}>
                  <button
                    onClick={() => setSelectedNode(node.id)}
                    className={`flex-1 p-3.5 rounded-2xl border transition-all text-left group cursor-pointer ${
                      isSelected
                        ? `${node.bg} ${node.border} shadow-lg ${node.glow}`
                        : 'bg-slate-900/60 border-white/[0.06] hover:border-white/[0.15] hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`p-1.5 rounded-xl ${node.bg} ${node.color}`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
                        {node.badge}
                      </span>
                    </div>
                    <p className="font-heading font-semibold text-xs text-slate-100 group-hover:text-cyan-300 transition">
                      {node.title}
                    </p>
                  </button>

                  {idx < NODES.length - 1 && (
                    <ArrowRight size={16} className="text-slate-600 shrink-0 mx-1" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected Node Deep Dive Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/30">
          <div className="glass-card rounded-2xl p-6 border border-white/[0.1]">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${activeNodeData.bg} ${activeNodeData.color}`}>
                <activeNodeData.icon size={22} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  {activeNodeData.details.heading}
                </h3>
                <span className="text-xs text-indigo-300/80 font-mono">Stage: {activeNodeData.title}</span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {activeNodeData.details.desc}
            </p>

            {/* Telemetry Stats Grid */}
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sliders size={13} className="text-cyan-400" />
              Runtime Telemetry & Hyperparameters
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {activeNodeData.details.stats.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-1"
                >
                  <span className="text-[11px] text-slate-400 block">{s.label}</span>
                  <span className="text-xs font-mono font-semibold text-slate-100 block">
                    {s.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            NexusRAG Engine v2.5 • Full End-to-End Multistage Pipeline
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-lg shadow-indigo-600/25"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
