"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getPityProgress } from "@/lib/engagement/mystery-box";

/**
 * Genshin Impact-style pity progress indicator.
 * Shows how close the user is to guaranteed epic/legendary drops.
 */
export function PityProgress() {
  const progress = useMemo(() => getPityProgress(), []);

  if (!progress) return null;

  return (
    <div className="space-y-2">
      {/* Epic pity */}
      <PityBar
        label="Epic"
        color="#a855f7"
        current={progress.sinceLastEpic}
        threshold={progress.epicThreshold}
      />
      {/* Legendary pity */}
      <PityBar
        label="Legendary"
        color="#f59e0b"
        current={progress.sinceLastLegendary}
        threshold={progress.legendaryThreshold}
      />
    </div>
  );
}

function PityBar({
  label,
  color,
  current,
  threshold,
}: {
  label: string;
  color: string;
  current: number;
  threshold: number;
}) {
  const ratio = Math.min(current / threshold, 1);
  const isClose = ratio >= 0.7;

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-16 text-right text-[10px] font-medium uppercase tracking-wider"
        style={{ color: isClose ? color : "rgba(255,255,255,0.4)" }}
      >
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="w-10 text-right text-[10px] tabular-nums text-white/40">
        {current}/{threshold}
      </span>
    </div>
  );
}
