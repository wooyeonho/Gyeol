"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

interface CareHeatmapProps {
  /** Array of care dates (ISO strings) in the last ~6 months */
  careDates: string[];
  accentColor?: string;
}

/**
 * Care Heatmap — GitHub-style green squares showing daily care activity.
 * Shows the last 26 weeks (6 months) of care interactions.
 * Inspired by GitHub's contribution graph.
 */
export function CareHeatmap({ careDates, accentColor = "#22d3ee" }: CareHeatmapProps) {
  const { t } = useTranslations();

  const { weeks, maxCount } = useMemo(() => {
    // Count care actions per day
    const countMap = new Map<string, number>();
    for (const d of careDates) {
      const key = d.slice(0, 10); // YYYY-MM-DD
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    // Build 26 weeks of data
    const today = new Date();
    const weeksArr: { date: string; count: number; dayOfWeek: number }[][] = [];
    let max = 0;

    for (let w = 25; w >= 0; w--) {
      const week: { date: string; count: number; dayOfWeek: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + (6 - d)));
        const key = date.toISOString().slice(0, 10);
        const count = countMap.get(key) ?? 0;
        if (count > max) max = count;
        week.push({ date: key, count, dayOfWeek: date.getDay() });
      }
      weeksArr.push(week);
    }

    return { weeks: weeksArr, maxCount: max || 1 };
  }, [careDates]);

  const getColor = (count: number) => {
    if (count === 0) return "rgba(255,255,255,0.04)";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return `${accentColor}25`;
    if (intensity < 0.5) return `${accentColor}45`;
    if (intensity < 0.75) return `${accentColor}70`;
    return `${accentColor}95`;
  };

  const totalCare = careDates.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70">
          {t("dnaEditor.heatmapTitle") || "Care Heatmap"}
        </h3>
        <span className="text-xs text-white/40">
          {(t("dnaEditor.careCount") || "{count} care actions").replace("{count}", String(totalCare))}
        </span>
      </div>
      <motion.div
        className="flex gap-[2px] overflow-x-auto pb-1 scrollbar-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map((day) => (
              <motion.div
                key={day.date}
                className="rounded-[2px]"
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: getColor(day.count),
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: wi * 0.015, duration: 0.2 }}
                title={`${day.date}: ${day.count}`}
              />
            ))}
          </div>
        ))}
      </motion.div>
      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-[9px] text-white/30">
        <span>{t("dnaEditor.noDataYet") || "Less"}</span>
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <div
            key={level}
            className="h-2 w-2 rounded-[1px]"
            style={{
              backgroundColor: level === 0 ? "rgba(255,255,255,0.04)" : `${accentColor}${Math.round(25 + level * 70).toString(16).padStart(2, "0")}`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
