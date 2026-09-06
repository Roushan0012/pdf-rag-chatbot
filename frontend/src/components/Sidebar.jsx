import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Layers,
  Database,
  Cpu,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Sliders,
  Server,
  Info,
  ChevronRight,
  GitGraph,
  HelpCircle
} from 'lucide-react';

export default function Sidebar({
  docInfo,
  onFileUpload,
  isUploading,
  onLoadSample,
  onRemovePDF,
  onClearSession,
  uploadError,
  isOpen,
  onClose,
  onOpenSettings,
  onOpenPipeline,
  ragParams,
  onParamsChange
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showTuning, setShowTuning] = useState(false);
  const [activeStepInfo, setActiveStepInfo] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files[0].name.toLowerCase().endsWith('.pdf')) {
        onFileUpload(files[0]);
      } else {
        alert('Please upload a valid PDF document.');
      }
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const PIPELINE_STEPS = [
    {
      title: '1. Parent-Child Chunking',
      icon: Layers,
      color: 'text-indigo-400',
      border: 'border-indigo-500/30',
      bg: 'bg-indigo-500/10',
      desc: 'Small 300-char child chunks for pinpoint FAISS search, mapped back to 1200-char parent chunks for complete LLM reasoning context.'
    },
    {
      title: '2. Hybrid Search (RRF)',
      icon: Database,
      color: 'text-cyan-400',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      desc: 'Dense FAISS embeddings + Sparse BM25 keyword matching fused via Reciprocal Rank Fusion (RRF) to retrieve top candidates.'
    },
    {
      title: '3. Cross-Encoder Reranking',
      icon: Cpu,
      color: 'text-purple-400',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10',
      desc: 'ms-marco-MiniLM evaluates deep query-passage cross-attention to score and filter down to the most relevant passages.'
    },
    {
      title: '4. Groq Fast Inference',
      icon: Zap,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      desc: 'Streams grounded answers token-by-token with sub-second latency and cited references.'
    }
  ];

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-80 sm:w-88 bg-[#080d1c]/95 backdrop-blur-3xl border-r border-white/[0.08] flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-sm text-white flex items-center gap-1.5">
              Knowledge Engine
              <span className="px-1.5 py-0.2 bg-indigo-500/20 text-cyan-300 border border-indigo-500/30 rounded text-[9px] font-mono uppercase tracking-wider">
                v2.5 Pro
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Decoupled Multi-Stage RAG</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
        >
          ✕
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Upload Zone */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud size={14} className="text-indigo-400" />
              Document Ingestion
            </label>
            <button
              onClick={onLoadSample}
              disabled={isUploading}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
            >
              <Zap size={11} /> Load Sample
            </button>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`relative rounded-3xl p-5 text-center cursor-pointer transition-all border-2 border-dashed ${
              isDragOver
                ? 'border-indigo-400 bg-indigo-500/15 scale-[0.99] shadow-lg shadow-indigo-500/20'
                : 'border-white/[0.12] hover:border-indigo-500/50 bg-slate-900/60 hover:bg-slate-900/90'
            } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-inner">
                {isUploading ? (
                  <Loader2 size={24} className="animate-spin text-cyan-400" />
                ) : (
                  <FileText size={22} className="text-cyan-400" />
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-100">
                  {isUploading ? 'Parsing & Indexing Document...' : 'Click or drop PDF here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Parent-child chunking, BM25 & FAISS vectors
                </p>
              </div>
            </div>

            {isUploading && (
              <div className="mt-3.5 space-y-1.5">
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-400 h-1.5 rounded-full animate-pulse w-4/5" />
                </div>
                <p className="text-[10.5px] text-cyan-400 italic">
                  Parsing pages, building BM25 & FAISS stores...
                </p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mt-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-snug">{uploadError}</span>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="w-full py-1.5 px-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Server size={12} />
                  Configure Backend URL
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active Document Card */}
        {docInfo && docInfo.filename ? (
          <div className="glass-card rounded-3xl p-4 space-y-3 animate-fade-in border border-indigo-500/25 bg-gradient-to-b from-indigo-950/40 to-slate-900/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Active Knowledge Base
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                Indexed
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-white/[0.06] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 flex items-center justify-center text-cyan-400 shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate" title={docInfo.filename}>
                  {docInfo.filename}
                </p>
                <p className="text-[11px] text-slate-400">{docInfo.pageCount} Page(s) Ingested</p>
              </div>
            </div>

            {/* Chunk Breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-white/[0.06] text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Parent Chunks</span>
                <span className="text-base font-bold text-white font-mono">
                  {docInfo.parentChunks || 0}
                </span>
                <span className="text-[9.5px] text-indigo-300 block">~1200 chars</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-white/[0.06] text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Child Chunks</span>
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {docInfo.childChunks || 0}
                </span>
                <span className="text-[9.5px] text-cyan-300 block">~300 chars</span>
              </div>
            </div>

            {/* Document Action Buttons: Remove / Replace */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-2 px-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                title="Upload another PDF to replace current one"
              >
                <UploadCloud size={13} />
                <span>Replace PDF</span>
              </button>

              <button
                type="button"
                onClick={onRemovePDF}
                disabled={isUploading}
                className="w-full py-2 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-100 border border-rose-500/30 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                title="Remove this document from memory"
              >
                <Trash2 size={13} className="text-rose-400" />
                <span>Remove PDF</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-slate-900/40 border border-white/[0.06] text-center">
            <p className="text-xs text-slate-400">No document loaded yet.</p>
            <p className="text-[11px] text-slate-500 mt-1">Upload a PDF or click 'Load Sample'.</p>
          </div>
        )}

        {/* Pipeline Architecture Showcase */}
        <div className="glass-panel rounded-3xl p-4 space-y-2.5 border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={13} className="text-amber-400" />
              Pipeline Architecture
            </h3>
            {onOpenPipeline && (
              <button
                onClick={onOpenPipeline}
                className="text-[11px] text-indigo-400 hover:text-cyan-300 transition flex items-center gap-1 font-semibold"
              >
                <GitGraph size={12} />
                <span>Full Graph</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isSelected = activeStepInfo === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveStepInfo(isSelected ? null : idx)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? `${step.bg} ${step.border}`
                      : 'bg-slate-900/60 border-white/[0.04] hover:border-white/[0.12] hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-xl ${step.bg} ${step.color}`}>
                        <Icon size={14} />
                      </div>
                      <span className="font-semibold text-slate-200 text-[11.5px]">
                        {step.title}
                      </span>
                    </div>
                    <ChevronRight
                      size={13}
                      className={`text-slate-500 transition-transform ${
                        isSelected ? 'rotate-90' : ''
                      }`}
                    />
                  </div>

                  {isSelected && (
                    <p className="text-[11px] text-slate-300 mt-2 pl-6 leading-relaxed border-t border-white/[0.06] pt-1.5">
                      {step.desc}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Parameter Tuning Accordion */}
        <div className="glass-panel rounded-3xl p-4 border border-white/[0.08]">
          <button
            onClick={() => setShowTuning(!showTuning)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              <Sliders size={13} className="text-cyan-400" />
              RAG Tuning Sliders
            </span>
            <span className="text-[10px] text-cyan-400 lowercase font-mono">
              {showTuning ? 'hide' : 'tune'}
            </span>
          </button>

          {showTuning && (
            <div className="mt-3.5 space-y-3 text-xs animate-fade-in">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Hybrid Search Depth (Top-K):</span>
                  <span className="font-mono text-cyan-400 font-bold">{ragParams?.topK || 15}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={ragParams?.topK || 15}
                  onChange={(e) => onParamsChange && onParamsChange({ topK: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Reranked Output (Top-N):</span>
                  <span className="font-mono text-purple-400 font-bold">{ragParams?.topN || 5}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={ragParams?.topN || 5}
                  onChange={(e) => onParamsChange && onParamsChange({ topN: parseInt(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">LLM Temperature:</span>
                  <span className="font-mono text-emerald-400 font-bold">{ragParams?.temperature || 0.1}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={ragParams?.temperature || 0.1}
                  onChange={(e) => onParamsChange && onParamsChange({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/[0.08] bg-slate-950/80">
        <button
          onClick={onClearSession}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white/[0.03] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 transition text-xs font-medium"
        >
          <Trash2 size={14} />
          Reset Session Memory
        </button>
      </div>
    </aside>
  );
}
