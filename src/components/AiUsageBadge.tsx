import React from 'react';
import { Sparkles, Activity } from 'lucide-react';
import { AiUsageStats } from '../types';

interface Props {
  stats: AiUsageStats | null;
  loading?: boolean;
}

export const AiUsageBadge: React.FC<Props> = ({ stats, loading }) => {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI Usage Today:</span>
      </div>
      {loading ? (
        <span className="text-slate-400 animate-pulse">Checking...</span>
      ) : (
        <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-mono">
          <span>
            Analyses: <strong className="text-slate-900 dark:text-white">{stats?.todayAnalyses ?? 0}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>
            Content: <strong className="text-slate-900 dark:text-white">{stats?.todayContentGenerations ?? 0}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
