import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, Sparkles, Server, CheckCircle2, AlertCircle, ExternalLink, Code2, Copy, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { GoogleTrendsProvider } from '../services/trending/googleTrendsProvider';

export const SettingsView: React.FC = () => {
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [migrationSql, setMigrationSql] = useState<string>('');
  const [showSqlPreview, setShowSqlPreview] = useState<boolean>(false);
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);

  const fetchDbStatus = () => {
    setIsCheckingDb(true);
    fetch('/api/db-status')
      .then((res) => res.json())
      .then((data) => {
        setDbStatus(data);
        setIsCheckingDb(false);
      })
      .catch((err) => {
        console.error(err);
        setIsCheckingDb(false);
      });
  };

  useEffect(() => {
    fetch('/api/provider-status')
      .then((res) => res.json())
      .then((data) => setProviderInfo(data))
      .catch((err) => console.error(err));

    fetchDbStatus();

    fetch('/api/migration-sql')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.sql) {
          setMigrationSql(data.sql);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div id="settings-view" className="space-y-8 animate-in fade-in duration-300 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          <span>Architecture, Providers & Deployment Documentation</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Complete operational reference for the serverless AI Trend Research engine.
        </p>
      </div>

      {/* 1. System Status & Security */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-slate-800/40 backdrop-blur-md shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              Database & Cache
            </span>
            {dbStatus?.schemaReady ? (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/25 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Schema Ready
              </span>
            ) : dbStatus?.configured ? (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/25 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Memory Fallback Active
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-slate-500/15 text-slate-400 font-semibold border border-slate-500/25">
                In-Memory
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Multi-tier cache: high-speed in-memory (24h TTL for AI analyses) + Supabase persistence with seamless fallback.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-slate-800/40 backdrop-blur-md shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              AI Intelligence
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-400 font-semibold border border-indigo-500/25">
              Gemini 3.8-Flash
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Server-side only execution via @google/genai SDK. API key remains completely concealed from client browsers.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-slate-800/40 backdrop-blur-md shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-400" />
              Compute Architecture
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/25">
              100% Serverless
            </span>
          </div>
          <p className="text-xs text-slate-400">
            No continuous VPS running. Vercel Serverless Functions + Cloudflare / Express micro-gateway with scale-to-zero.
          </p>
        </div>
      </div>

      {/* Database Schema Status & 1-Click Migration Panel */}
      {dbStatus?.configured && !dbStatus?.schemaReady && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <span>Supabase Connected &bull; Schema Migration Ready to Run</span>
                </h3>
                <p className="text-xs text-amber-300/80 mt-1">
                  The app is operating normally using its instant In-Memory cache tier. To enable permanent multi-device persistence, run the initial schema migration in your Supabase SQL Editor.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchDbStatus}
                disabled={isCheckingDb}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin text-indigo-400' : ''}`} />
                <span>Recheck Schema</span>
              </button>
              {migrationSql && (
                <button
                  type="button"
                  onClick={() => handleCopy(migrationSql, 'migration-sql')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {copiedKey === 'migration-sql' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied SQL!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Migration SQL</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-amber-500/20">
            <div className="flex items-center justify-between text-xs text-amber-300/90 mb-2">
              <span className="font-semibold">Quick 2-Step Schema Activation:</span>
              {migrationSql && (
                <button
                  type="button"
                  onClick={() => setShowSqlPreview(!showSqlPreview)}
                  className="text-[11px] text-amber-300 hover:text-white underline underline-offset-2 flex items-center gap-1"
                >
                  {showSqlPreview ? 'Hide SQL Code' : 'View SQL Code'}
                  {showSqlPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
              <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3 inline" /></a> &rarr; go to <strong>SQL Editor</strong> &rarr; Click <strong>New query</strong>.</li>
              <li>Click <strong>Copy Migration SQL</strong> above, paste it into the editor, and click <strong>Run</strong>. That's all!</li>
            </ol>

            {showSqlPreview && migrationSql && (
              <div className="mt-3 relative rounded-xl border border-white/10 bg-slate-950/80 p-3 overflow-hidden">
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-white/10 text-[10px] text-slate-400 font-mono">
                  <span>supabase/migrations/20260907_initial_schema.sql</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(migrationSql, 'migration-sql-preview')}
                    className="text-indigo-400 hover:text-indigo-300 font-sans flex items-center gap-1"
                  >
                    {copiedKey === 'migration-sql-preview' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'migration-sql-preview' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-48 scrollbar-thin">
                  {migrationSql}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Provider Documentation & Comparison (Section 6 & 31) */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            Trending Data Provider Comparison (Section 6 & 31)
          </h3>
          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/25">
            Active: {providerInfo?.activeProvider || 'GoogleTrendsProvider'}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          The app implements a flexible `TrendingProvider` interface allowing seamless switching between official Google Trends RSS, SerpApi, or RapidAPI without code rewrites.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-white/10 rounded-xl overflow-hidden">
            <thead className="bg-slate-900/40 font-mono text-[11px] uppercase text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3">Cost</th>
                <th className="py-2.5 px-3">Reliability</th>
                <th className="py-2.5 px-3">Rate Limits</th>
                <th className="py-2.5 px-3">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr className="bg-emerald-500/5 font-semibold">
                <td className="py-3 px-3 font-bold text-white">
                  1. Google Trends RSS (Active Primary)
                </td>
                <td className="py-3 px-3 text-emerald-400">100% Free</td>
                <td className="py-3 px-3">High (Official Google Feed)</td>
                <td className="py-3 px-3">Handled by 5m Supabase Cache</td>
                <td className="py-3 px-3 text-emerald-300">Recommended for standard production without billing</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-white">
                  2. SerpApi Google Trends
                </td>
                <td className="py-3 px-3">Free 100 searches/mo, then $50/mo</td>
                <td className="py-3 px-3">99.9% SLA</td>
                <td className="py-3 px-3">Per API plan</td>
                <td className="py-3 px-3">Best for high-volume enterprise SaaS with historical trends</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-white">
                  3. RapidAPI Google Trends
                </td>
                <td className="py-3 px-3">Freemium (~500 req/mo)</td>
                <td className="py-3 px-3">Medium (Community proxy)</td>
                <td className="py-3 px-3">Per subscription</td>
                <td className="py-3 px-3">Viable secondary fallback option</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. VPS-Free Deployment Guide (Section 32) */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Deployment Without VPS (Vercel + Supabase) Guide (Section 32)
        </h3>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1 backdrop-blur-md">
            <span className="font-bold text-white block">Step 1: Push project to GitHub</span>
            <p>Push this codebase to a GitHub repository. No VPS or dedicated server setup is needed.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1 backdrop-blur-md">
            <span className="font-bold text-white block">Step 2: Import repository into Vercel</span>
            <p>Go to vercel.com &rarr; "Add New Project" &rarr; Import your GitHub repo. Vercel automatically detects the Vite frontend and `/api` serverless routes.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1 backdrop-blur-md">
            <span className="font-bold text-white block">Step 3: Configure Environment Variables in Vercel</span>
            <div className="font-mono bg-[#020617]/90 text-slate-200 p-3 rounded-xl my-2 text-[11px] space-y-1 border border-white/10">
              <div>GEMINI_API_KEY=your_gemini_api_key_here</div>
              <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=your_anon_key_here</div>
              <div>SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1 backdrop-blur-md">
            <span className="font-bold text-white block">Step 4: Run Database Migration in Supabase</span>
            <p>Open Supabase SQL Editor and execute the schema located at <code>/supabase/migrations/20260907_initial_schema.sql</code>.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1 backdrop-blur-md">
            <span className="font-bold text-white block">Step 5: Deploy & Validate</span>
            <p>Click "Deploy". Verify <code>/api/trending?region=ID</code> returns real Google Trends data, and test Gemini AI analysis in the dashboard!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
