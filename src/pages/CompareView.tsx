import React, { useState } from 'react';
import { GitCompare, Plus, X, BarChart3, Check } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingSearch } from '../types';

interface Props {
  trends: TrendingSearch[];
  onSelectTrend: (trend: TrendingSearch) => void;
}

export const CompareView: React.FC<Props> = ({ trends, onSelectTrend }) => {
  // Pre-select first 3 trends for immediate visualization
  const [selectedIds, setSelectedIds] = useState<string[]>(
    trends.slice(0, 3).map((t) => t.id)
  );

  const selectedTrends = trends.filter((t) => selectedIds.includes(t.id));

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 5) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  // Prepare comparison metrics for chart
  const comparisonData = selectedTrends.map((t, idx) => {
    const opp = t.opportunity_score ?? Math.max(50, 95 - t.rank * 5);
    const content = Math.min(100, Math.round(opp * 0.95));
    const monetization = Math.min(100, Math.round(opp * 0.88));
    const kdp = Math.min(100, Math.max(40, Math.round(opp * 0.82)));
    const momentum = Math.min(100, Math.max(40, 100 - t.rank * 6));

    return {
      name: t.keyword.length > 15 ? t.keyword.slice(0, 15) + '...' : t.keyword,
      fullName: t.keyword,
      rank: t.rank,
      Opportunity: opp,
      ContentPotential: content,
      Monetization: monetization,
      KdpPotential: kdp,
      Momentum: momentum,
    };
  });

  return (
    <div id="compare-view" className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-purple-600" />
          <span>Compare Trends (Up to 5 Topics)</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Side-by-side comparative analysis of Opportunity Scores, Content Feasibility, Monetization, and KDP potential.
        </p>
      </div>

      {/* Keyword Selection Chips */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md p-5 rounded-2xl space-y-3 shadow-xl">
        <span className="text-xs font-bold text-slate-300 block">
          Select up to 5 keywords ({selectedIds.length}/5 selected):
        </span>
        <div className="flex flex-wrap gap-2">
          {trends.map((t) => {
            const isSelected = selectedIds.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleSelect(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/30'
                    : 'bg-slate-800/40 border border-white/10 text-slate-300 hover:bg-slate-800/80 backdrop-blur-md'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                <span>#{t.rank} {t.keyword}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Opportunity & Potential Comparison (Recharts)</span>
          </h3>
          <span className="text-[10px] font-mono tracking-wider font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
            AI ESTIMATES
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(7, 13, 29, 0.9)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(16px)',
                  color: '#fff',
                  fontSize: '12px',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Opportunity" fill="#6366f1" name="Opportunity Score" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Monetization" fill="#10b981" name="Monetization" radius={[6, 6, 0, 0]} />
              <Bar dataKey="ContentPotential" fill="#3b82f6" name="Content Potential" radius={[6, 6, 0, 0]} />
              <Bar dataKey="KdpPotential" fill="#f59e0b" name="KDP Potential" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 font-bold text-sm text-white">
          Comparative Matrix
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/40 font-mono text-[11px] uppercase text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Metric</th>
                {comparisonData.map((d, i) => (
                  <th key={i} className="py-3 px-4 text-white font-bold">
                    {d.fullName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium text-slate-200">
              <tr>
                <td className="py-3 px-4 text-slate-500 font-mono">Current Rank</td>
                {comparisonData.map((d, i) => (
                  <td key={i} className="py-3 px-4 font-mono font-bold">
                    #{d.rank}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-500 font-mono">Opportunity Score</td>
                {comparisonData.map((d, i) => (
                  <td key={i} className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {d.Opportunity}/100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-500 font-mono">Monetization Score</td>
                {comparisonData.map((d, i) => (
                  <td key={i} className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                    {d.Monetization}/100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-500 font-mono">Content Potential</td>
                {comparisonData.map((d, i) => (
                  <td key={i} className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">
                    {d.ContentPotential}/100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-500 font-mono">KDP Potential</td>
                {comparisonData.map((d, i) => (
                  <td key={i} className="py-3 px-4 font-mono text-amber-600 dark:text-amber-400">
                    {d.KdpPotential}/100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-500 font-mono">Action</td>
                {selectedTrends.map((t, i) => (
                  <td key={i} className="py-3 px-4">
                    <button
                      onClick={() => onSelectTrend(t)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Deep Analyze &rarr;
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
