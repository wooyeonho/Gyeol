"use client";

/**
 * Inspiration of the Day — a small home banner that rotates through the
 * 80+ world-class app catalog deterministically (same day → same app).
 *
 * Pulls from `lib/world-class/catalog.ts` via `inspirationOfTheDay(dayKey)`
 * so that editing the catalog immediately updates this rotation. Links to
 * the filtered inspirations page for exploration.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AXES,
  TREND_SOURCES,
  inspirationOfTheDay,
} from "@/lib/world-class/catalog";

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function InspirationOfTheDay() {
  // Hydration-safe: render a placeholder until mounted so SSR and client match.
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    setKey(dayKey());
  }, []);

  if (!key) {
    return (
      <div className="mb-2 h-[72px] rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
    );
  }

  const pick = inspirationOfTheDay(key);
  const axis = AXES.find((a) => a.id === pick.axis);
  const sourceLabels = pick.sources
    .map((s) => TREND_SOURCES.find((t) => t.id === s)?.label ?? s)
    .join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-2 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-amber-500/10 px-4 py-3 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/60">
            <span>오늘의 영감</span>
            <span className="text-white/30">·</span>
            <span className="text-white/70">{axis?.label ?? pick.axis}</span>
            {sourceLabels && (
              <>
                <span className="text-white/30">·</span>
                <span className="truncate text-white/50">{sourceLabels}</span>
              </>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-white">
            <b className="text-white">{pick.name}</b>{" "}
            <span className="text-white/70">— {pick.oneLine}</span>
          </p>
        </div>
        <Link
          href={`/world-class/inspirations?axis=${pick.axis}`}
          className="flex-shrink-0 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-xs text-white/90 hover:bg-white/[0.14] transition"
        >
          결에 이식 →
        </Link>
      </div>
    </motion.div>
  );
}
