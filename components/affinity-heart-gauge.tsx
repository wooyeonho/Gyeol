"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface AffinityHeartGaugeProps {
  /** intimacy_score from AgentState (0-100) */
  score: number;
  /** Max score for normalization */
  maxScore?: number;
  /** Compact mode for inline display */
  compact?: boolean;
}

const HEART_STAGES = [
  { threshold: 0, emoji: "🤍", label: "처음 만남", color: "#9ca3af" },
  { threshold: 10, emoji: "💛", label: "알아가는 중", color: "#fbbf24" },
  { threshold: 25, emoji: "💚", label: "친해지는 중", color: "#4ade80" },
  { threshold: 50, emoji: "💙", label: "깊은 유대", color: "#60a5fa" },
  { threshold: 75, emoji: "💜", label: "특별한 사이", color: "#c084fc" },
  { threshold: 90, emoji: "❤️", label: "최고의 인연", color: "#f87171" },
] as const;

function getHeartStage(score: number, maxScore: number) {
  const normalized = Math.min(100, (score / maxScore) * 100);
  let stage = HEART_STAGES[0];
  for (const s of HEART_STAGES) {
    if (normalized >= s.threshold) stage = s;
  }
  return { ...stage, normalized };
}

/**
 * Affinity heart gauge — visualizes creature-user bond level.
 * Inspired by Baldur's Gate 3 companion approval and Pokemon friendship.
 */
export function AffinityHeartGauge({ score, maxScore = 100, compact = false }: AffinityHeartGaugeProps) {
  const { emoji, label, color, normalized } = useMemo(
    () => getHeartStage(score, maxScore),
    [score, maxScore],
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={`${label} (${Math.round(normalized)}%)`}>
        <motion.span
          key={emoji}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-sm"
        >
          {emoji}
        </motion.span>
        <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${normalized}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span
            key={emoji}
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="text-lg"
          >
            {emoji}
          </motion.span>
          <div>
            <p className="text-xs font-medium text-white/80">{label}</p>
            <p className="text-[10px] text-white/40">친밀도 {Math.round(normalized)}%</p>
          </div>
        </div>
        <div className="flex gap-0.5">
          {HEART_STAGES.map((s) => (
            <div
              key={s.threshold}
              className="h-2 w-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: normalized >= s.threshold ? s.color : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${normalized}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
