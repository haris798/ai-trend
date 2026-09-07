import React, { useEffect, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { TrendingSearch } from '../types';

interface Props { currentTrends: TrendingSearch[]; onSelectTrend: (trend: TrendingSearch) => void; onShowToast: (msg: string) => void; }
interface TrackedAlert { id: string; keyword: string; region: string; targetRank: number; enabled: boolean; createdAt: string; }

const STORAGE_KEY = 'ai_trend_alerts';
const CLIENT_ID_KEY = 'ai_trend_client_id';

function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(CLIENT_ID_KEY, id); }
    return id;
  } catch { return 'anonymous-browser'; }
}

function toAlert(row: any): TrackedAlert {
  return { id: String(row.id), keyword: String(row.keyword), region: String(row.region || 'ID'), targetRank: Number(row.target_rank ?? row.targetRank ?? 10), enabled: row.enabled !== false, createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()) };
}

export const AlertsView: React.FC<Props> = ({ currentTrends, onSelectTrend, onShowToast }) => {
  const [alerts, setAlerts] = useState<TrackedAlert[]>(() => {
    try { const stored = localStorage.getItem(STORAGE_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const headers = { 'x-client-id': getClientId(), 'Content-Type': 'application/json' };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/alerts', { headers });
        const json = await res.json();
        if (active && res.ok && Array.isArray(json.data)) setAlerts(json.data.map(toAlert));
      } catch { /* localStorage remains the offline fallback */ }
      finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)); } catch { /* ignore storage errors */ } }, [alerts]);

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = newKeyword.trim();
    if (!keyword) return;
    const region = currentTrends[0]?.region || 'ID';
    if (alerts.some(a => a.keyword.toLowerCase() === keyword.toLowerCase() && a.region === region)) { onShowToast('Keyword alert already exists'); return; }

    const optimistic: TrackedAlert = { id: crypto.randomUUID(), keyword, region, targetRank: 10, enabled: true, createdAt: new Date().toISOString() };
    setAlerts(prev => [optimistic, ...prev]);
    setNewKeyword('');
    try {
      const res = await fetch('/api/alerts', { method: 'POST', headers, body: JSON.stringify({ keyword, region, targetRank: 10, enabled: true }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      if (json.data) setAlerts(prev => prev.map(a => a.id === optimistic.id ? toAlert(json.data) : a));
      onShowToast(`Alert set for "${keyword}"`);
    } catch { onShowToast(`Alert set locally; server sync unavailable`); }
  };

  const handleDeleteAlert = async (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    try {
      const res = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Delete failed');
      onShowToast('Alert removed');
    } catch { onShowToast('Alert removed locally; server sync unavailable'); }
  };

  return (
    <div id="alerts-view" className="space-y-6 animate-in fade-in duration-300">
      <div><h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2"><Bell className="w-6 h-6 text-amber-500" /><span>Keyword Alerts & Rank Tracker</span></h2><p className="text-xs text-slate-500 dark:text-slate-400">Track keywords and see a dashboard alert when they enter the configured Top 10.</p></div>
      <form onSubmit={handleAddAlert} className="flex gap-2 p-4 bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl"><input type="text" placeholder="Enter keyword to monitor..." value={newKeyword} onChange={e => setNewKeyword(e.target.value)} className="flex-1 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-500" /><button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-indigo-600/25"><Plus className="w-3.5 h-3.5" /> Track Keyword</button></form>
      <div className="space-y-3">
        {alerts.length === 0 ? <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-slate-800/40 backdrop-blur-md p-8"><Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="font-bold text-slate-300 text-sm">No keyword alerts</p><p className="text-xs text-slate-400 mt-1">Add a keyword above to start tracking it.</p></div> : alerts.map(alert => {
          const matchingTrend = currentTrends.find(t => t.region === alert.region && (t.keyword.toLowerCase().includes(alert.keyword.toLowerCase()) || alert.keyword.toLowerCase().includes(t.keyword.toLowerCase())));
          const isTrendingNow = Boolean(alert.enabled && matchingTrend && matchingTrend.rank <= alert.targetRank);
          return <div key={alert.id} className={`p-4 rounded-2xl border backdrop-blur-md transition-all flex items-center justify-between gap-4 shadow-xl ${isTrendingNow ? 'bg-amber-500/15 border-amber-500/30' : 'bg-slate-800/40 border-white/10'}`}>
            <div className="flex items-center gap-3"><div className={`p-2.5 rounded-xl ${isTrendingNow ? 'bg-amber-500 text-white animate-bounce' : 'bg-slate-800/60 text-slate-400 border border-white/10'}`}><Bell className="w-4 h-4" /></div><div><div className="flex items-center gap-2 flex-wrap"><h4 className="font-bold text-sm text-white">{alert.keyword}</h4>{isTrendingNow && <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-lg bg-amber-500 text-white">TRENDING: #{matchingTrend?.rank}</span>}</div><p className="text-xs text-slate-400 mt-0.5">Region: {alert.region} • Target: Top {alert.targetRank} • Created: {new Date(alert.createdAt).toLocaleDateString()}</p></div></div>
            <div className="flex items-center gap-2">{matchingTrend && <button onClick={() => onSelectTrend(matchingTrend)} className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors">Analyze</button>}<button onClick={() => handleDeleteAlert(alert.id)} className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Remove alert"><Trash2 className="w-4 h-4" /></button></div>
          </div>;
        })}
      </div>
    </div>
  );
};
