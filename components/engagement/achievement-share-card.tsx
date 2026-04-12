"use client";

import { SpringCard } from "@/components/ui/spring-card";
import { SpringButton } from "@/components/ui/spring-button";

interface AchievementShareCardProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  };
  unlockedAt?: string;
  onShare?: (id: string) => void;
  className?: string;
}

const RARITY_STYLE: Record<string, { border: string; bg: string; text: string }> = {
  common: { border: "border-white/10", bg: "bg-white/[0.03]", text: "text-white/60" },
  rare: { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-400" },
  epic: { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-400" },
  legendary: { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-400" },
  mythic: { border: "border-pink-500/30", bg: "bg-pink-500/5", text: "text-pink-400" },
};

export function AchievementShareCard({
  achievement,
  unlockedAt,
  onShare,
  className = "",
}: AchievementShareCardProps) {
  const style = RARITY_STYLE[achievement.rarity] ?? RARITY_STYLE.common;

  return (
    <SpringCard
      className={`relative overflow-hidden border ${style.border} ${style.bg} text-center ${className}`}
    >
      {/* Rarity glow */}
      <div className="absolute inset-0 opacity-10 blur-3xl">
        <div className={`h-full w-full ${style.bg}`} />
      </div>

      <div className="relative z-10 space-y-3 py-2">
        <span className="text-4xl">{achievement.icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-white">{achievement.name}</h3>
          <p className="mt-0.5 text-xs text-white/50">{achievement.description}</p>
        </div>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${style.text}`}>
          {achievement.rarity}
        </p>
        {unlockedAt && (
          <p className="text-[10px] text-white/25">
            {new Date(unlockedAt).toLocaleDateString()}
          </p>
        )}
        {onShare && (
          <SpringButton
            variant="ghost"
            size="sm"
            onClick={() => onShare(achievement.id)}
            className="mx-auto"
          >
            공유하기
          </SpringButton>
        )}
      </div>
    </SpringCard>
  );
}
