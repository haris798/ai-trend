import React, { useEffect, useState } from 'react';
import { Check, Database, KeyRound, Save, ShieldCheck, Sparkles, Eye, EyeOff } from 'lucide-react';

const STORAGE_KEY = 'ai_trend_runtime_config';

type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
};

const DEFAULT_CONFIG: RuntimeConfig = {
  supabaseUrl: 'https://tvirwhgvujcdutijggss.supabase.co',
  supabaseAnonKey: '',
  geminiApiKey: '',
};

export const RuntimeConfigSettings: React.FC = () => {
  const [config, setConfig] = useState<RuntimeConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
    } catch {
      // Ignore malformed local configuration.
    }
  }, []);

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved(false);
    }
  };

  return (
    <section className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-5 shadow-xl">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          Runtime Configuration
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Configure browser-local connection settings. Server-side secrets remain in Vercel environment variables.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="runtime-supabase-url" className="text-xs font-semibold text-slate-300">Supabase Project URL</label>
        <input
          id="runtime-supabase-url"
          type="url"
          value={config.supabaseUrl}
          onChange={(e) => setConfig(prev => ({ ...prev, supabaseUrl: e.target.value }))}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          placeholder="https://your-project.supabase.co"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="runtime-supabase-anon" className="text-xs font-semibold text-slate-300">Supabase Anon / Publishable Key</label>
        <input
          id="runtime-supabase-anon"
          type="password"
          value={config.supabaseAnonKey}
          onChange={(e) => setConfig(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          placeholder="ey... or sb_publishable_..."
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="runtime-gemini-key" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Personal Gemini API Key
        </label>
        <div className="relative">
          <input
            id="runtime-gemini-key"
            type={showGeminiKey ? 'text' : 'password'}
            value={config.geminiApiKey}
            onChange={(e) => setConfig(prev => ({ ...prev, geminiApiKey: e.target.value }))}
            className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="AIza..."
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowGeminiKey(prev => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-200 transition-colors"
            title={showGeminiKey ? 'Hide Gemini API key' : 'Show Gemini API key'}
          >
            {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-amber-300/80 leading-relaxed">
          Browser-local only. This value is stored in this browser and is <strong>not</strong> copied to Vercel or used as the server-side Gemini secret. For production server-side AI, configure <code className="text-slate-200">GEMINI_API_KEY</code> in Vercel.
        </p>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Safe browser configuration: Supabase URL and anon/publishable key are intended for client use. Never enter <code className="text-slate-300">SUPABASE_SERVICE_ROLE_KEY</code> here.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Saved locally on this browser</span>
        </div>
        <button
          type="button"
          onClick={save}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors flex items-center gap-1.5"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>
    </section>
  );
};
