"use client";

import { SpringCard } from "@/components/ui/spring-card";

interface CompatibilityCardProps {
  myCreatureName: string;
  otherCreatureName: string;
  score: number; // 0-100
  topTraits: { axis: string; closeness: number }[];
  className?: string;
}

function getCompatLabel(score: number): { text: string; color: string; emoji: string } {
  if (score >= 90) return { text: "운명적 궁합", color: "text-pink-400", emoji: "💕" };
  if (score >= 75) return { text: "훌륭한 궁합", color: "text-purple-400", emoji: "💜" };
  if (score >= 50) return { text: "좋은 궁합", color: "text-blue-400", emoji: "💙" };
  if (score >= 25) return { text: "보통 궁합", color: "text-white/50", emoji: "🤍" };
  return { text: "독특한 조합", color: "text-amber-400", emoji: "⚡" };
}

export function CompatibilityCard({
  myCreatureName,
  otherCreatureName,
  score,
  topTraits,
  className = "",
}: CompatibilityCardProps) {
  const label = getCompatLabel(score);

  return (
    <SpringCard className={`space-y-3 text-center ${className}`}>
      <div className="flex items-center justify-center gap-3">
        <span className="text-2xl">🐣</span>
        <div className="flex flex-col items-center">
          <span className="text-3xl">{label.emoji}</span>
          <span className={`text-lg font-bold ${label.color}`}>{score}%</span>
        </div>
        <span className="text-2xl">🐣</span>
      </div>

      <div>
        <p className={`text-sm font-medium ${label.color}`}>{label.text}</p>
        <p className="text-[10px] text-white/35 mt-0.5">
          {myCreatureName} × {otherCreatureName}
        </p>
      </div>

      {topTraits.length > 0 && (
        <div className="space-y-1.5">
          {topTraits.slice(0, 3).map((trait) => (
            <div key={trait.axis} className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 w-16 text-right truncate">{trait.axis}</span>
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  style={{ width: `${Math.round(trait.closeness * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-white/30 w-8">{Math.round(trait.closeness * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </SpringCard>
  );
}
