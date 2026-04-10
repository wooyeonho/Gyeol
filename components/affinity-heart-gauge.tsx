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

const TOTAL_HEARTS = 5;

const RELATIONSHIP_LEVELS = [
  { threshold: 0, label: "처음 만남", color: "#9ca3af" },
  { threshold: 10, label: "알아가는 중", color: "#fbbf24" },
  { threshold: 25, label: "친해지는 중", color: "#4ade80" },
  { threshold: 50, label: "깊은 유대", color: "#60a5fa" },
  { threshold: 75, label: "특별한 사이", color: "#c084fc" },
  { threshold: 90, label: "최고의 인연", color: "#f87171" },
] as const;

function getRelationshipLevel(normalized: number): typeof RELATIONSHIP_LEVELS[number] {
  let level: typeof RELATIONSHIP_LEVELS[number] = RELATIONSHIP_LEVELS[0];
  for (const l of RELATIONSHIP_LEVELS) {
    if (normalized >= l.threshold) level = l;
  }
  return level;
}

/**
 * Heart SVG path — a filled heart silhouette used for both outline and fill.
 * viewBox is 0 0 24 24.
 */
function HeartIcon({
  fillPercent,
  color,
  index,
  size = 18,
}: {
  fillPercent: number;
  color: string;
  index: number;
  size?: number;
}) {
  const clipId = `heart-fill-${index}`;
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: "easeOut" }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          {/* Rectangle that reveals from bottom to top based on fillPercent */}
          <motion.rect
            x="0"
            width="24"
            initial={{ y: 24, height: 0 }}
            animate={{ y: 24 - (24 * fillPercent) / 100, height: (24 * fillPercent) / 100 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.08 }}
          />
        </clipPath>
      </defs>
      {/* Empty heart outline */}
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.5"
      />
      {/* Filled heart — clipped by animated rect */}
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={color}
        clipPath={`url(#${clipId})`}
      />
    </motion.svg>
  );
}

/**
 * Compute per-heart fill percentages for a 5-heart gauge.
 * Each heart represents 20% of the total. Score 0-100 maps linearly
 * across the 5 hearts.
 */
function computeHeartFills(normalized: number): number[] {
  const fills: number[] = [];
  const perHeart = 100 / TOTAL_HEARTS;
  for (let i = 0; i < TOTAL_HEARTS; i++) {
    const heartStart = i * perHeart;
    const heartEnd = (i + 1) * perHeart;
    if (normalized >= heartEnd) {
      fills.push(100);
    } else if (normalized <= heartStart) {
      fills.push(0);
    } else {
      fills.push(((normalized - heartStart) / perHeart) * 100);
    }
  }
  return fills;
}

/**
 * Affinity heart gauge -- BG3/Zelda-style 5-heart companion approval meter.
 *
 * Hearts fill smoothly from left to right based on intimacy_score.
 * Each heart represents 20% of the max score. Partially-filled hearts
 * animate with a bottom-to-top reveal.
 */
export function AffinityHeartGauge({ score, maxScore = 100, compact = false }: AffinityHeartGaugeProps) {
  const normalized = useMemo(
    () => Math.min(100, Math.max(0, (score / maxScore) * 100)),
    [score, maxScore],
  );
  const level = useMemo(() => getRelationshipLevel(normalized), [normalized]);
  const fills = useMemo(() => computeHeartFills(normalized), [normalized]);

  if (compact) {
    return (
      <div
        className="flex items-center gap-0.5"
        title={`${level.label} (${Math.round(normalized)}%)`}
        role="meter"
        aria-valuenow={Math.round(normalized)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Affinity: ${level.label}`}
      >
        {fills.map((fill, i) => (
          <HeartIcon key={i} fillPercent={fill} color={level.color} index={i} size={14} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
      role="meter"
      aria-valuenow={Math.round(normalized)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Affinity: ${level.label}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-white/80">{level.label}</p>
          <p className="text-[10px] text-white/40">친밀도 {Math.round(normalized)}%</p>
        </div>
        <div className="flex gap-0.5">
          {fills.map((fill, i) => (
            <HeartIcon key={i} fillPercent={fill} color={level.color} index={i} size={18} />
          ))}
        </div>
      </div>
    </div>
  );
}
