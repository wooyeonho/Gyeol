"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

/**
 * GitHub-style 12-week activity heatmap — bins /api/activity items by day
 * and renders a 7-row × 12-col grid colored by count intensity. Helps users
 * feel their creature's rhythm (quiet days, streaks, bursts) instead of
 * hiding activity volume behind a list scroll.
 */

type ActivityItem = {
  id: string;
  created_at?: string;
};

const WEEKS = 12;
const DAYS = 7;
const CELLS = WEEKS * DAYS; // 84 cells, 84 days back

function bucketByDay(items: ActivityItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item.created_at) continue;
    const key = item.created_at.slice(0, 10); // YYYY-MM-DD
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function intensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

export function ActivityHeatmap({ accentColor = "#22d3ee" }: { accentColor?: string }) {
  const { t, locale } = useTranslations();
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setItems([]);
          return;
        }
        const json = (await res.json()) as { items?: ActivityItem[] };
        if (!cancelled) setItems(Array.isArray(json.items) ? json.items : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    }
    void pull();
    return () => {
      cancelled = true;
    };
  }, []);

  const { cells, totalActive, monthLabels } = useMemo(() => {
    const buckets = bucketByDay(items ?? []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Walk back CELLS days ending today.
    const result: Array<{ date: Date; key: string; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
    for (let i = CELLS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const count = buckets.get(key) ?? 0;
      result.push({ date: d, key, count, level: intensityLevel(count) });
    }
    const active = result.filter((c) => c.count > 0).length;
    // Month labels for each column's first day-of-month transition.
    const seenMonths = new Set<number>();
    const labels: Array<{ col: number; label: string }> = [];
    for (let col = 0; col < WEEKS; col++) {
      const cell = result[col * DAYS];
      if (!cell) continue;
      const month = cell.date.getMonth();
      if (!seenMonths.has(month)) {
        seenMonths.add(month);
        labels.push({
          col,
          label: cell.date.toLocaleDateString(locale === "ko" ? "ko-KR" : locale, { month: "short" }),
        });
      }
    }
    return { cells: result, totalActive: active, monthLabels: labels };
  }, [items, locale]);

  // Color stops derived from the accent color for a cohesive look.
  const levelColor = (lv: 0 | 1 | 2 | 3 | 4) => {
    if (lv === 0) return "rgba(255,255,255,0.05)";
    const alpha = [0, 0.22, 0.45, 0.68, 0.92][lv];
    return `color-mix(in srgb, ${accentColor} ${Math.round(alpha * 100)}%, transparent)`;
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            {t("dna.heatmapLabel")}
          </p>
          <p className="mt-0.5 text-xs text-white/40">
            {t("dna.heatmapHint").replace("{count}", String(totalActive)).replace("{days}", String(CELLS))}
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-white/35">
          <span>{locale.startsWith("ko") ? "적음" : "less"}</span>
          {[0, 1, 2, 3, 4].map((lv) => (
            <span
              key={lv}
              className="h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: levelColor(lv as 0 | 1 | 2 | 3 | 4) }}
            />
          ))}
          <span>{locale.startsWith("ko") ? "많음" : "more"}</span>
        </div>
      </div>

      {items === null ? (
        <div className="h-[108px] animate-pulse rounded-lg bg-white/[0.04]" />
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1">
            {/* Month labels row */}
            <div className="flex gap-[3px] pl-6">
              {Array.from({ length: WEEKS }).map((_, col) => {
                const label = monthLabels.find((m) => m.col === col);
                return (
                  <div key={col} className="w-3 text-[9px] text-white/35">
                    {label ? label.label : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex items-start gap-1">
              {/* Weekday labels */}
              <div className="flex flex-col gap-[3px] pr-1 pt-[1px] text-[9px] text-white/30">
                {["", locale.startsWith("ko") ? "월" : "M", "", locale.startsWith("ko") ? "수" : "W", "", locale.startsWith("ko") ? "금" : "F", ""].map(
                  (d, i) => (
                    <span key={i} className="h-3 leading-3">
                      {d}
                    </span>
                  ),
                )}
              </div>
              {/* Cell grid */}
              <div className="flex gap-[3px]">
                {Array.from({ length: WEEKS }).map((_, col) => (
                  <div key={col} className="flex flex-col gap-[3px]">
                    {Array.from({ length: DAYS }).map((_, row) => {
                      const idx = col * DAYS + row;
                      const cell = cells[idx];
                      if (!cell) return <div key={row} className="h-3 w-3" />;
                      return (
                        <motion.div
                          key={row}
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: (col + row) * 0.006, ease: "easeOut" }}
                          className="h-3 w-3 rounded-[2px]"
                          style={{ backgroundColor: levelColor(cell.level) }}
                          title={`${cell.key} — ${cell.count}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
