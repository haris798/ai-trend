import React, { useState } from 'react';
import { Check, Copy, Database, ExternalLink } from 'lucide-react';
import { getSupabaseStatus } from '../lib/supabase';

export const SupabaseSettings: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const status = getSupabaseStatus();

  const handleCopy = async () => {
    if (!status.url) return;
    try {
      await navigator.clipboard.writeText(status.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Supabase Configuration
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Frontend Supabase URL. The service-role key remains server-side only.
          </p>
        </div>
        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg font-semibold border ${status.configured ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25'}`}>
          {status.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
        </span>
      </div>

      <div className="space-y-2">
        <label htmlFor="supabase-url" className="text-xs font-semibold text-slate-300">
          Supabase Project URL
        </label>
        <div className="flex gap-2">
          <input
            id="supabase-url"
            type="url"
            value={status.url}
            readOnly
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 font-mono focus:outline-none"
            placeholder="https://your-project.supabase.co"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!status.url}
            className="px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Set this with <code className="text-slate-300">VITE_SUPABASE_URL</code> at build/deployment time. Current project URL: <span className="text-slate-300">https://tvirwhgvujcdutijggss.supabase.co</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="https://supabase.com/dashboard/project/tvirwhgvujcdutijggss"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Supabase Dashboard
        </a>
      </div>
    </section>
  );
};
