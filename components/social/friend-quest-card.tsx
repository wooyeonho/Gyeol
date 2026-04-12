"use client";

import { SpringCard } from "@/components/ui/spring-card";
import { SpringButton } from "@/components/ui/spring-button";

interface FriendQuestCardProps {
  quest: {
    id: string;
    title: string;
    description: string;
    friendName: string;
    progress: number;
    target: number;
    rewardCoins: number;
    expiresAt?: string;
  };
  onAccept?: (id: string) => void;
  className?: string;
}

export function FriendQuestCard({ quest, onAccept, className = "" }: FriendQuestCardProps) {
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
  const completed = quest.progress >= quest.target;

  return (
    <SpringCard className={`space-y-3 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-purple-300/70">친구 퀘스트</p>
          <h3 className="mt-0.5 text-sm font-medium text-white">{quest.title}</h3>
        </div>
        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-300">
          🪙 {quest.rewardCoins}
        </span>
      </div>

      <p className="text-xs text-white/50">{quest.description}</p>

      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <span>👤 {quest.friendName}</span>
        {quest.expiresAt && (
          <span>⏰ {new Date(quest.expiresAt).toLocaleDateString()}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/35">
          <span>{quest.progress}/{quest.target}</span>
          <span>{pct}%</span>
        </div>
      </div>

      {!completed && onAccept && (
        <SpringButton
          variant="secondary"
          size="sm"
          onClick={() => onAccept(quest.id)}
          className="w-full"
        >
          수락하기
        </SpringButton>
      )}
      {completed && (
        <div className="rounded-lg bg-green-500/10 py-1.5 text-center text-xs font-medium text-green-400">
          완료!
        </div>
      )}
    </SpringCard>
  );
}
