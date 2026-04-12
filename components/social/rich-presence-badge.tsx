"use client";

import { motion } from "framer-motion";

export type PresenceActivity = "chatting" | "exploring" | "caring" | "evolving" | "idle" | "battling";

interface RichPresenceBadgeProps {
  activity: PresenceActivity;
  displayName?: string;
  className?: string;
}

const ACTIVITY_CONFIG: Record<PresenceActivity, { icon: string; label: string; color: string; pulse: boolean }> = {
  chatting: { icon: "💬", label: "대화 중", color: "bg-green-500", pulse: true },
  exploring: { icon: "🔍", label: "탐험 중", color: "bg-blue-500", pulse: true },
  caring: { icon: "🫧", label: "돌봄 중", color: "bg-pink-500", pulse: true },
  evolving: { icon: "✨", label: "진화 중", color: "bg-amber-500", pulse: true },
  battling: { icon: "⚔️", label: "배틀 중", color: "bg-red-500", pulse: true },
  idle: { icon: "💤", label: "쉬는 중", color: "bg-white/30", pulse: false },
};

export function RichPresenceBadge({ activity, displayName, className = "" }: RichPresenceBadgeProps) {
  const config = ACTIVITY_CONFIG[activity];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${config.color} ${config.pulse ? "animate-ping opacity-75" : ""}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.color}`} />
      </span>
      <span className="text-[10px] text-white/60">
        {displayName ? `${displayName} · ` : ""}
        {config.icon} {config.label}
      </span>
    </motion.div>
  );
}
