"use client";

import { useMemo } from "react";

interface ContributionHeatmapProps {
  /** Array of { date: "YYYY-MM-DD", count: number } */
  data: { date: string; count: number }[];
  /** Number of weeks to show (default 12) */
  weeks?: number;
  className?: string;
}

const LEVELS = [
  "bg-white/[0.04]",
  "bg-emerald-500/20",
  "bg-emerald-500/40",
  "bg-emerald-500/60",
  "bg-emerald-400/80",
];

function getLevel(count: number, max: number): number {
  if (count === 0) return 0;
  if (max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function ContributionHeatmap({
  data,
  weeks = 12,
  className = "",
}: ContributionHeatmapProps) {
  const { grid, max } = useMemo(() => {
    const map = new Map(data.map((d) => [d.date, d.count]));
    const today = new Date();
    const totalDays = weeks * 7;
    const cells: { date: string; count: number; dayOfWeek: number }[] = [];
    let maxCount = 0;

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = map.get(key) ?? 0;
      if (count > maxCount) maxCount = count;
      cells.push({ date: key, count, dayOfWeek: d.getDay() });
    }

    // Group into weeks (columns)
    const cols: typeof cells[] = [];
    let col: typeof cells = [];
    for (const cell of cells) {
      col.push(cell);
      if (cell.dayOfWeek === 6) {
        cols.push(col);
        col = [];
      }
    }
    if (col.length > 0) cols.push(col);

    return { grid: cols, max: maxCount };
  }, [data, weeks]);

  const totalInteractions = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-white/60">돌봄 히트맵</p>
        <p className="text-[10px] text-white/35">{totalInteractions}회 상호작용</p>
      </div>
      <div className="flex gap-[3px] overflow-x-auto scrollbar-none">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={`h-[11px] w-[11px] rounded-[2px] ${LEVELS[getLevel(cell.count, max)]} transition-colors`}
                title={`${cell.date}: ${cell.count}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-white/30">
        <span>Less</span>
        {LEVELS.map((bg, i) => (
          <div key={i} className={`h-[9px] w-[9px] rounded-[2px] ${bg}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
