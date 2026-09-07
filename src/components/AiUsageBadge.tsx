import React from 'react';
import { Sparkles, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AiUsageStats } from '../types';

interface Props {
  stats: AiUsageStats | null;
  loading?: boolean;
  onOpenSettings?: () => void;
}

export const AiUsageBadge: React.FC<Props> = ({ stats, loading, onOpenSettings }) => {
  const isPro = stats?.tier === 'pro_byok';
  const isExceeded = Boolean(stats?.isQuotaExceeded);
  const remaining = stats?.remainingToday ?? 5;
  const limit = stats?.dailyLimit ?? 5;

  return (
    <div
      onClick={onOpenSettings}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all cursor-pointer select-none ${
        isPro
          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50'
          : isExceeded
          ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 text-rose-400 hover:border-rose-500/50 animate-pulse'
          : 'bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-500/40'
      }`}
      title={
        isPro
          ? 'Pro Tier (BYOK Active): Unlimited Gemini analyses using your personal API key.'
          : isExceeded
          ? 'Free Tier quota exceeded! Click to add your personal Gemini API key for unlimited analyses.'
          : `Free Tier: ${remaining} of ${limit} analyses remaining today. Click to add your own key for unlimited.`
      }
    >
      {isPro ? (
        <div className="flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-bold tracking-wide">PRO (BYOK):</span>
          <span className="font-mono text-emerald-300">Unlimited</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {isExceeded ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          )}
          <span className="font-medium text-slate-500 dark:text-slate-400">Free:</span>
          {loading ? (
            <span className="text-slate-400 animate-pulse">...</span>
          ) : (
            <span className="font-mono font-bold">
              {isExceeded ? (
                <span className="text-rose-400">0/{limit} (Limit Hit)</span>
              ) : (
                <span className="text-slate-900 dark:text-white">
                  {remaining}/{limit} left
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
