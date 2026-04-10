"use client";

import { useMemo } from "react";

interface StreakHeatmapProps {
  /** Array of dates (ISO strings) when user was active in the last 365 days */
  activeDates: string[];
  /** Accent color for filled cells */
  accentColor?: string;
}

/**
 * GitHub-style contribution heatmap for creature care streaks.
 * Shows 365 days of activity with 4 intensity levels.
 *
 * Inspired by: GitHub contribution graph, Duolingo streak calendar
 */
export function StreakHeatmap({ activeDates, accentColor = "#818cf8" }: StreakHeatmapProps) {
  const { weeks, maxCount } = useMemo(() => {
    // Count activity per day
    const countMap = new Map<string, number>();
    for (const d of activeDates) {
      const key = d.slice(0, 10); // YYYY-MM-DD
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const allWeeks: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];
    let maxC = 1;

    const cursor = new Date(startDate);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      const count = countMap.get(key) ?? 0;
      if (count > maxC) maxC = count;
      currentWeek.push({ date: key, count });
      if (currentWeek.length === 7) {
        allWeeks.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) allWeeks.push(currentWeek);

    return { weeks: allWeeks, maxCount: maxC };
  }, [activeDates]);

  function getOpacity(count: number): number {
    if (count === 0) return 0.06;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 0.25;
    if (ratio <= 0.5) return 0.5;
    if (ratio <= 0.75) return 0.75;
    return 1;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[2px]" role="img" aria-label={`Activity heatmap: ${activeDates.length} active days`}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map((day) => (
              <div
                key={day.date}
                className="h-[10px] w-[10px] rounded-[2px]"
                style={{
                  backgroundColor: accentColor,
                  opacity: getOpacity(day.count),
                }}
                title={`${day.date}: ${day.count} interactions`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-white/40">
        <span>Less</span>
        {[0.06, 0.25, 0.5, 0.75, 1].map((op) => (
          <div
            key={op}
            className="h-[10px] w-[10px] rounded-[2px]"
            style={{ backgroundColor: accentColor, opacity: op }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
