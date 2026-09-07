import React, { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { TrendingSearch } from '../types';

interface Props {
  currentTrends: TrendingSearch[];
  onSelectTrend: (trend: TrendingSearch) => void;
  onShowToast: (msg: string) => void;
}

interface TrackedAlert {
  id: string;
  keyword: string;
  targetRank: number;
  createdAt: string;
}

export const AlertsView: React.FC<Props> = ({
  currentTrends,
  onSelectTrend,
  onShowToast,
}) => {
  const [alerts, setAlerts] = useState<TrackedAlert[]>([
    { id: '1', keyword: currentTrends[0]?.keyword || 'AI Tools', targetRank: 10, createdAt: '2026-09-07' },
    { id: '2', keyword: 'Timnas Indonesia', targetRank: 5, createdAt: '2026-09-07' },
    { id: '3', keyword: 'Apple iPhone', targetRank: 10, createdAt: '2026-09-06' },
  ]);

  const [newKeyword, setNewKeyword] = useState('');

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const newAlert: TrackedAlert = {
      id: Date.now().toString(),
      keyword: newKeyword.trim(),
      targetRank: 10,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAlerts([newAlert, ...alerts]);
    setNewKeyword('');
    onShowToast(`Alert set for "${newAlert.keyword}"`);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
    onShowToast('Alert removed');
  };

  return (
    <div id="alerts-view" className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-amber-500" />
          <span>Keyword Alerts & Rank Tracker</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track specific target keywords and receive instant dashboard notifications when they enter the Top 10.
        </p>
      </div>

      {/* Add Alert Form */}
      <form
        onSubmit={handleAddAlert}
        className="flex gap-2 p-4 bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl"
      >
        <input
          type="text"
          placeholder="Enter keyword to monitor (e.g. 'Canva', 'Crypto', 'Kemenkes')..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          className="flex-1 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 backdrop-blur-md placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-indigo-600/25 border border-indigo-400/30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Track Keyword</span>
        </button>
      </form>

      {/* Tracked Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          // Check if tracked keyword is currently trending in currentTrends
          const matchingTrend = currentTrends.find(
            (t) => t.keyword.toLowerCase().includes(alert.keyword.toLowerCase()) || alert.keyword.toLowerCase().includes(t.keyword.toLowerCase())
          );

          const isTrendingNow = Boolean(matchingTrend && matchingTrend.rank <= alert.targetRank);

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border backdrop-blur-md transition-all flex items-center justify-between gap-4 shadow-xl ${
                isTrendingNow
                  ? 'bg-amber-500/15 border-amber-500/30'
                  : 'bg-slate-800/40 border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    isTrendingNow
                      ? 'bg-amber-500 text-white animate-bounce'
                      : 'bg-slate-800/60 text-slate-400 border border-white/10'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white">
                      {alert.keyword}
                    </h4>
                    {isTrendingNow && (
                      <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-lg bg-amber-500 text-white shadow-xs">
                        TRENDING ALERT: #{matchingTrend?.rank} NOW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target: Enters Top {alert.targetRank} • Created: {alert.createdAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {matchingTrend && (
                  <button
                    onClick={() => onSelectTrend(matchingTrend)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/25"
                  >
                    Analyze Trend
                  </button>
                )}

                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Remove alert"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
