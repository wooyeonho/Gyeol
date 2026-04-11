"use client";

import { motion } from "framer-motion";

interface EvolutionProgressBarProps {
  /** Current generation level */
  genLevel: number;
  /** Progress toward next evolution (0-100) */
  progress: number;
  /** Size variant */
  size?: "sm" | "md";
  /** Locale for labels (ko/en/ja/zh/es) */
  locale?: string;
}

const LABELS: Record<string, { gen: string; next: string }> = {
  ko: { gen: "Gen", next: "다음 진화" },
  en: { gen: "Gen", next: "Next Evolution" },
  ja: { gen: "Gen", next: "次の進化" },
  zh: { gen: "Gen", next: "下次进化" },
  es: { gen: "Gen", next: "Próxima evolución" },
};

/**
 * Evolution progress bar — displays gen level + progress toward next evolution.
 * Inspired by Duolingo's XP bar and Replika's relationship progress.
 */
export function EvolutionProgressBar({
  genLevel,
  progress,
  size = "md",
  locale = "ko",
}: EvolutionProgressBarProps) {
  const labels = LABELS[locale] ?? LABELS.en;
  const clamped = Math.max(0, Math.min(100, progress));
  const isReady = clamped >= 100;
  const height = size === "sm" ? "h-1" : "h-1.5";
  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className="flex flex-col gap-0.5 w-full max-w-[160px]" aria-label={`${labels.gen} ${genLevel}: ${Math.round(clamped)}% to ${labels.next}`}>
      <div className={`flex items-center justify-between ${textSize} font-medium uppercase tracking-wider text-white/50`}>
        <span>
          {labels.gen} {genLevel}
        </span>
        <span className={isReady ? "text-amber-300" : "text-white/40"}>
          {Math.round(clamped)}%
        </span>
      </div>
      <div
        className={`relative w-full overflow-hidden rounded-full bg-white/10 ${height}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
      >
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${
            isReady
              ? "bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-100 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
              : "bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        {isReady && (
          <motion.div
            className="absolute inset-0 rounded-full bg-amber-300/30"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}
