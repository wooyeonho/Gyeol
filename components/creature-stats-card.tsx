"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { deriveStats, STAT_META, type CreatureStats } from "@/lib/creature/stats";
import type { CreatureDNA } from "@/lib/genome/dna";

interface CreatureStatsCardProps {
  dna: CreatureDNA;
  genLevel?: number;
  /** Locale for labels */
  locale?: string;
  /** Accent color for stat bars */
  accentColor?: string;
}

/**
 * Pokemon/Diablo-style stat card showing creature power derived from DNA.
 * Renders animated stat bars with color-coded categories.
 */
export function CreatureStatsCard({
  dna,
  genLevel = 1,
  locale = "en",
  accentColor,
}: CreatureStatsCardProps) {
  const stats = useMemo(() => deriveStats(dna, genLevel), [dna, genLevel]);
  const isKo = locale?.startsWith("ko");

  const statKeys = Object.keys(STAT_META) as (keyof Omit<CreatureStats, "total">)[];
  const maxStatValue = Math.max(...statKeys.map((k) => stats[k]), 1);

  return (
    <div className="space-y-3">
      {/* Total power */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-widest text-white/40">
          {isKo ? "전투력" : "Power"}
        </span>
        <span className="text-2xl font-bold tabular-nums" style={{ color: accentColor }}>
          {stats.total}
        </span>
      </div>

      {/* Individual stats */}
      <div className="space-y-2">
        {statKeys.map((key, i) => {
          const meta = STAT_META[key];
          const value = stats[key];
          const ratio = value / maxStatValue;

          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-5 text-center text-sm">{meta.icon}</span>
              <span className="w-8 text-[11px] font-mono text-white/50">
                {meta.label}
              </span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${ratio * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                />
              </div>
              <span className="w-8 text-right text-xs font-semibold tabular-nums text-white/70">
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
