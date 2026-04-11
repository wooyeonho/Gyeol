"use client";

import { motion } from "framer-motion";

interface LevelBarProps {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  compact?: boolean;
}

/**
 * Duolingo-style level + XP progress bar.
 * Shows current level as a badge and xp progress to the next level.
 */
export function LevelBar({ level, xpIntoLevel, xpForNext, compact = false }: LevelBarProps) {
  const pct = Math.max(0, Math.min(100, (xpIntoLevel / Math.max(1, xpForNext)) * 100));
  const remaining = Math.max(0, xpForNext - xpIntoLevel);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-fuchsia-400/30 text-[10px] font-bold text-white">
          {level}
        </div>
        <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-cyan-300 to-fuchsia-400"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            key={level}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/25 via-indigo-400/20 to-fuchsia-400/25 text-lg font-bold text-white shadow-[0_0_30px_rgba(96,165,250,0.25)]"
          >
            {level}
            <span className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
          </motion.div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
              Level {level}
            </p>
            <p className="mt-0.5 text-sm text-white/85">
              {xpIntoLevel} / {xpForNext} XP
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">다음 레벨까지</p>
          <p className="mt-0.5 text-sm font-semibold text-cyan-100">
            {remaining} XP
          </p>
        </div>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/8">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative h-full bg-gradient-to-r from-cyan-300 via-indigo-400 to-fuchsia-400"
        >
          <span className="absolute inset-0 bg-white/20 [mask-image:linear-gradient(90deg,transparent,white,transparent)]" />
        </motion.div>
      </div>
    </div>
  );
}
