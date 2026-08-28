import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, Loader2, X, Globe, Zap, ExternalLink } from 'lucide-react';
import { getApiBase, setApiBase, checkBackendHealth } from '../services/api';

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
        ? (cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`)
        : getApiBase();

      const res = await fetch(`${testBase}/health`).catch((err) => ({ ok: false, error: err.message }));
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setTestResult({ ok: true, data });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0b1122] border border-slate-700/80 shadow-2xl p-6 space-y-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Server size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Backend API Connection</h3>
              <p className="text-xs text-slate-400">Configure Python Flask Server URL</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Backend Endpoint URL
            </label>
            <div className="relative flex items-center">
              <Globe size={16} className="absolute left-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. https://your-backend.onrender.com/api or /api"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl py-2.5 pl-10 pr-24 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleTest(urlInput)}
                disabled={isTesting}
                className="absolute right-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition flex items-center gap-1"
              >
                {isTesting ? <Loader2 size={12} className="animate-spin text-blue-400" /> : <Zap size={12} className="text-amber-400" />}
                Ping
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Leave blank to use default relative path (<code className="text-blue-400">/api</code>).
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {testResult.ok ? 'Backend Connected Successfully!' : 'Connection Failed'}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {testResult.ok
                    ? `Service: ${testResult.data?.service || 'Flask RAG API'} • Groq: ${testResult.data?.groq_configured ? 'Configured' : 'Missing Key'}`
                    : testResult.error}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions & Help */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5 text-slate-400">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5">
            💡 Quick Deployment Guide:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11.5px] leading-relaxed">
            <li>
              <strong>Running Locally:</strong> Start backend with <code className="text-blue-300">python backend/app.py</code> (runs on <code className="text-blue-300">http://127.0.0.1:5001</code>).
            </li>
            <li>
              <strong>Deployed on Vercel:</strong> Host your Flask backend on <a href="https://render.com" target="_blank" rel="noreferrer" className="text-blue-400 underline inline-flex items-center gap-0.5">Render.com <ExternalLink size={10} /></a> (free), then paste your Render URL here!
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
            Reset to Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
