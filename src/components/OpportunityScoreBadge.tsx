import React from 'react';

interface Props {
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  isAiEstimate?: boolean;
}

export const OpportunityScoreBadge: React.FC<Props> = ({
  score,
  size = 'md',
  showLabel = true,
  isAiEstimate = true,
}) => {
  if (score === undefined || score === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
        Score: Pending
      </span>
    );
  }

  let colorClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  let badgeText = 'High Potential';

  if (score < 50) {
    colorClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    badgeText = 'Moderate';
  } else if (score < 75) {
    colorClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    badgeText = 'Strong';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3.5 py-1.5 font-bold',
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border ${colorClass} ${sizeClasses[size]}`}
      >
        <span className="font-mono">{score}</span>
        <span className="text-[10px] opacity-75 font-normal">/100</span>
        {showLabel && <span className="hidden sm:inline text-xs ml-0.5">({badgeText})</span>}
      </span>
      {isAiEstimate && (
        <span className="text-[10px] font-mono tracking-wider font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          AI ESTIMATE
        </span>
      )}
    </div>
  );
};
