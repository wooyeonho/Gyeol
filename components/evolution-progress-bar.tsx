"use client";

import { motion } from "framer-motion";

type EvolutionProgressBarProps = {
  genLevel: number;
  progress: number; // 0-100
  locale: string;
  compact?: boolean;
};

const MILESTONES = [25, 50, 75];

export function EvolutionProgressBar({
  genLevel,
  progress,
  locale,
  compact = false,
}: EvolutionProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">Gen {genLevel}</span>
        <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="text-xs text-white/40">{Math.round(clampedProgress)}%</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-white/90">Gen {genLevel}</span>
          <span className="text-xs text-white/50">
            → Gen {genLevel + 1}
          </span>
        </div>
        <span className="text-xs text-white/60">{Math.round(clampedProgress)}%</span>
      </div>

      <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Glow effect on the bar edge */}
        <motion.div
          className="absolute inset-y-0 w-4 rounded-full blur-sm bg-cyan-400/50"
          initial={{ left: 0 }}
          animate={{ left: `calc(${clampedProgress}% - 8px)` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Milestone markers */}
        {MILESTONES.map((m) => (
          <div
            key={m}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${m}%`, backgroundColor: clampedProgress >= m ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)" }}
          />
        ))}
      </div>

      <p className="mt-2 text-xs text-white/45">
        {locale === "en"
          ? `${100 - Math.round(clampedProgress)}% more to evolve`
          : `진화까지 ${100 - Math.round(clampedProgress)}% 남음`}
      </p>
    </div>
  );
}
