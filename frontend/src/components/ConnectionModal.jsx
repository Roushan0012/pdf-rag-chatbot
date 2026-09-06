import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Globe,
  Zap,
  ExternalLink,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { getApiBase, setApiBase } from '../services/api';

export default function ConnectionModal({ isOpen, onClose, onConnectionChanged }) {
  const [urlInput, setUrlInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const current = localStorage.getItem('custom_backend_url') || '';
      setUrlInput(current);
      handleTest(current || getApiBase());
    }
  }, [isOpen]);

  const handleTest = async (targetUrl) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const cleanUrl = targetUrl ? targetUrl.trim().replace(/\/+$/, '') : '';
      const testBase = cleanUrl
        ? cleanUrl.endsWith('/api')
          ? cleanUrl
          : `${cleanUrl}/api`
        : getApiBase();

      const startTime = performance.now();
      const res = await fetch(`${testBase}/health`).catch((err) => ({
        ok: false,
        error: err.message
      }));
      const endTime = performance.now();

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setTestResult({
          ok: true,
          latency: Math.round(endTime - startTime),
          data
        });
      } else {
        setTestResult({
          ok: false,
          error: 'Backend endpoint unreachable or returned invalid response.'
        });
      }
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setApiBase(urlInput);
    if (onConnectionChanged) onConnectionChanged();
    onClose();
  };

  const handleResetToDefault = () => {
    setUrlInput('');
    setApiBase('');
    if (onConnectionChanged) onConnectionChanged();
    handleTest('/api');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0b101f] border border-white/[0.1] shadow-2xl p-6 sm:p-7 space-y-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Server size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">Backend Connection Settings</h3>
              <p className="text-xs text-slate-400">Configure Python Flask & Groq Engine API</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              API Base URL
            </label>
            <div className="relative flex items-center">
              <Globe size={16} className="absolute left-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. http://127.0.0.1:5001/api or https://my-rag.onrender.com/api"
                className="w-full bg-slate-950/80 border border-white/[0.1] rounded-xl py-2.5 pl-10 pr-24 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleTest(urlInput)}
                disabled={isTesting}
                className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-xs font-medium text-cyan-300 border border-indigo-500/30 transition flex items-center gap-1"
              >
                {isTesting ? (
                  <Loader2 size={12} className="animate-spin text-cyan-400" />
                ) : (
                  <Zap size={12} className="text-amber-400" />
                )}
                Ping
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Leave blank to use relative path (<code className="text-cyan-400 font-mono">/api</code>) via Vite proxy.
            </p>
          </div>

          {/* Test Status Card */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-semibold text-white">
                  {testResult.ok
                    ? `Connected Successfully (${testResult.latency}ms latency)`
                    : 'Connection Failed'}
                </p>
                <p className="text-[11.5px] opacity-90">
                  {testResult.ok
                    ? `Service: ${testResult.data?.service || 'Flask RAG API'} • Groq Key: ${
                        testResult.data?.groq_configured ? 'Configured ✅' : 'Missing ⚠️'
                      } • Default Model: ${testResult.data?.default_model || 'GPT-OSS-120B'}`
                    : testResult.error}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Deployment Helper */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/[0.06] text-xs space-y-1.5 text-slate-400">
          <p className="font-semibold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-indigo-400" />
            Deployment & Production:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
            <li>
              <strong>Local Full-Stack:</strong> Run <code className="text-indigo-300 font-mono">python run_dev.py</code> to launch both Flask (:5001) & React (:5173).
            </li>
            <li>
              <strong>Cloud Hosting:</strong> Host Flask on <a href="https://render.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">Render.com <ExternalLink size={10} /></a> and paste the deployed URL above.
            </li>
          </ul>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Reset Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
