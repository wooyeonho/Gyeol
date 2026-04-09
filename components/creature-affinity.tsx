"use client";

import { motion } from "framer-motion";

interface CreatureAffinityProps {
  /** Affinity level 0-100 */
  affinity: number;
  /** Creature name */
  name: string;
  /** Accent color */
  accentColor?: string;
}

const AFFINITY_TIERS = [
  { min: 0, label: { ko: "낯선 사이", en: "Stranger" }, hearts: 0 },
  { min: 20, label: { ko: "아는 사이", en: "Acquaintance" }, hearts: 1 },
  { min: 40, label: { ko: "친구", en: "Friend" }, hearts: 2 },
  { min: 60, label: { ko: "절친", en: "Close Friend" }, hearts: 3 },
  { min: 80, label: { ko: "소울메이트", en: "Soulmate" }, hearts: 4 },
  { min: 95, label: { ko: "영혼의 유대", en: "Soul Bond" }, hearts: 5 },
];

/**
 * Baldur's Gate 3-style companion affinity display.
 * Shows heart gauge and relationship tier.
 */
export function CreatureAffinity({
  affinity,
  name,
  accentColor = "#ec4899",
}: CreatureAffinityProps) {
  const tier = [...AFFINITY_TIERS].reverse().find((t) => affinity >= t.min) ?? AFFINITY_TIERS[0];

  return (
    <div className="flex items-center gap-3">
      {/* Heart gauge */}
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1, type: "spring" }}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill={i < tier.hearts ? accentColor : "rgba(255,255,255,0.1)"}
              stroke="none"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* Tier label */}
      <div className="flex flex-col">
        <span className="text-[10px] text-white/40 leading-none">{name}</span>
        <span className="text-xs font-medium" style={{ color: tier.hearts >= 3 ? accentColor : "rgba(255,255,255,0.6)" }}>
          {tier.label.ko}
        </span>
      </div>
    </div>
  );
}
