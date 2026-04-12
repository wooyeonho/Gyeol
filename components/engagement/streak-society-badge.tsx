"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/design/tokens";

export type StreakTier = "bronze" | "silver" | "gold" | "diamond";

interface StreakSocietyBadgeProps {
  tier: StreakTier;
  days: number;
  className?: string;
}

const TIER_CONFIG: Record<StreakTier, { label: string; icon: string; gradient: string; glow: string }> = {
  bronze: {
    label: "Bronze",
    icon: "🥉",
    gradient: "from-orange-700 to-amber-600",
    glow: "shadow-orange-500/20",
  },
  silver: {
    label: "Silver",
    icon: "🥈",
    gradient: "from-slate-400 to-gray-300",
    glow: "shadow-slate-400/20",
  },
  gold: {
    label: "Gold",
    icon: "🥇",
    gradient: "from-amber-400 to-yellow-300",
    glow: "shadow-amber-400/30",
  },
  diamond: {
    label: "Diamond",
    icon: "💎",
    gradient: "from-cyan-400 to-blue-300",
    glow: "shadow-cyan-400/30",
  },
};

export function getStreakTier(days: number): StreakTier {
  if (days >= 365) return "diamond";
  if (days >= 90) return "gold";
  if (days >= 30) return "silver";
  return "bronze";
}

export function StreakSocietyBadge({ tier, days, className = "" }: StreakSocietyBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.pop}
      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${config.gradient} px-3 py-1.5 shadow-lg ${config.glow} ${className}`}
    >
      <span className="text-sm">{config.icon}</span>
      <span className="text-xs font-bold text-white drop-shadow-sm">
        {config.label} · {days}일
      </span>
      <span className="text-xs">🔥</span>
    </motion.div>
  );
}
