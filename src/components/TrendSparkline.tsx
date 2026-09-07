import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  XAxis,
  Tooltip,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { TrendingSearch } from '../types';

interface Props {
  trend: TrendingSearch;
}

interface RankPoint {
  time: string;
  rank: number;
  label: string;
}

export const TrendSparkline: React.FC<Props> = ({ trend }) => {
  const chartData: RankPoint[] = useMemo(() => {
    // Generate deterministic 24-hour rank history
    let hash = 0;
    const str = `${trend.id || ''}-${trend.keyword}-${trend.rank}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    const currentRank = trend.rank;
    const direction = trend.trend_direction;

    const intervals = [
      { time: '24h ago', label: '24h ago' },
      { time: '18h ago', label: '18h ago' },
      { time: '12h ago', label: '12h ago' },
      { time: '6h ago', label: '6h ago' },
      { time: '2h ago', label: '2h ago' },
      { time: 'Now', label: 'Current' },
    ];

    if (direction === 'up') {
      const riseAmount = 3 + (absHash % 7);
      const startRank = currentRank + riseAmount;

      return intervals.map((step, idx) => {
        if (idx === intervals.length - 1) {
          return { time: step.time, rank: currentRank, label: step.label };
        }
        const progress = idx / (intervals.length - 1);
        const naturalProgress = Math.pow(progress, 1.25);
        const interpolated = Math.round(startRank - (startRank - currentRank) * naturalProgress);
        const jitter = idx > 0 && idx < intervals.length - 1 ? ((absHash + idx * 7) % 3) - 1 : 0;
        const rank = Math.max(1, interpolated + jitter);
        return { time: step.time, rank, label: step.label };
      });
    } else if (direction === 'down') {
      const dropAmount = 2 + (absHash % 6);
      const startRank = Math.max(1, currentRank - dropAmount);

      return intervals.map((step, idx) => {
        if (idx === intervals.length - 1) {
          return { time: step.time, rank: currentRank, label: step.label };
        }
        const progress = idx / (intervals.length - 1);
        const naturalProgress = Math.pow(progress, 1.15);
        const interpolated = Math.round(startRank + (currentRank - startRank) * naturalProgress);
        const jitter = idx > 0 && idx < intervals.length - 1 ? ((absHash + idx * 5) % 3) - 1 : 0;
        const rank = Math.max(1, interpolated + jitter);
        return { time: step.time, rank, label: step.label };
      });
    } else {
      return intervals.map((step, idx) => {
        if (idx === intervals.length - 1) {
          return { time: step.time, rank: currentRank, label: step.label };
        }
        const jitter = ((absHash + idx * 11) % 3) - 1;
        const rank = Math.max(1, currentRank + jitter);
        return { time: step.time, rank, label: step.label };
      });
    }
  }, [trend.id, trend.keyword, trend.rank, trend.trend_direction]);

  const initialRank = chartData[0]?.rank ?? trend.rank;
  const finalRank = chartData[chartData.length - 1]?.rank ?? trend.rank;
  // Note: in ranking, a lower number is a better position (e.g. from 10 to 2 is +8 positions)
  const rankDelta = initialRank - finalRank;

  // Visual styling based on trend direction
  const isUp = rankDelta > 0;
  const isDown = rankDelta < 0;

  const strokeColor = isUp ? '#10b981' : isDown ? '#f43f5e' : '#818cf8';
  const gradientId = `sparkline-grad-${encodeURIComponent(trend.id || trend.keyword).replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="w-full">
      {/* Top Header Label */}
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <Activity className="w-3 h-3 text-slate-400" />
          <span>24h Rank Trend</span>
        </span>
        <span
          className={`font-mono text-[10px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
            isUp
              ? 'text-emerald-400 bg-emerald-500/10'
              : isDown
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-slate-400 bg-slate-800/80'
          }`}
        >
          {isUp ? (
            <>
              <TrendingUp className="w-2.5 h-2.5" />
              <span>+{rankDelta} pos</span>
            </>
          ) : isDown ? (
            <>
              <TrendingDown className="w-2.5 h-2.5" />
              <span>{rankDelta} pos</span>
            </>
          ) : (
            <>
              <Minus className="w-2.5 h-2.5" />
              <span>Steady</span>
            </>
          )}
        </span>
      </div>

      {/* Sparkline Canvas */}
      <div className="h-12 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Invert YAxis so Rank #1 is at top */}
            <YAxis
              reversed
              hide
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <XAxis dataKey="time" hide />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as RankPoint;
                  return (
                    <div className="rounded-lg bg-slate-950/95 border border-white/15 px-2 py-1 text-[10px] shadow-xl backdrop-blur-md">
                      <p className="text-slate-400 font-mono">{data.label}</p>
                      <p className="font-bold text-white flex items-center gap-1 font-mono">
                        Rank <span className="text-indigo-300">#{data.rank}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="rank"
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              activeDot={{
                r: 3.5,
                fill: strokeColor,
                stroke: '#0f172a',
                strokeWidth: 1.5,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Time Horizon Legend */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5 px-0.5">
        <span>-24h (Rank #{initialRank})</span>
        <span>Now (Rank #{finalRank})</span>
      </div>
    </div>
  );
};
