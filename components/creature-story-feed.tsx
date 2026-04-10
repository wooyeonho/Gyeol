"use client";

import { useEffect, useState } from "react";
import {
  getActiveStories,
  type CreatureStory,
  type StoryMood,
} from "@/lib/social/creature-stories";

const MOOD_EMOJI: Record<StoryMood, string> = {
  happy: "😊",
  sad: "😢",
  excited: "🤩",
  calm: "😌",
  anxious: "😰",
  playful: "😜",
  curious: "🤔",
  tired: "😴",
  neutral: "😐",
};

interface CreatureStoryFeedProps {
  locale?: string;
}

export function CreatureStoryFeed({ locale = "ko" }: CreatureStoryFeedProps) {
  const isKo = locale === "ko" || locale.startsWith("ko-");
  const [stories, setStories] = useState<CreatureStory[]>([]);

  useEffect(() => {
    setStories(getActiveStories());
  }, []);

  if (stories.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
        <h3 className="text-sm font-semibold text-white/80 mb-2">
          {isKo ? "크리처 스토리" : "Creature Stories"}
        </h3>
        <p className="text-xs text-white/40 text-center py-3">
          {isKo ? "아직 활성 스토리가 없어요" : "No active stories yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
      <h3 className="text-sm font-semibold text-white/80 mb-3">
        {isKo ? "크리처 스토리" : "Creature Stories"}
        <span className="ml-1.5 text-[10px] font-normal text-white/40">24h</span>
      </h3>

      {/* Horizontal scrollable story bubbles */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {stories.map((story) => {
          const elapsed = Date.now() - new Date(story.createdAt).getTime();
          const hoursAgo = Math.floor(elapsed / 3_600_000);
          const timeLabel = hoursAgo < 1 ? (isKo ? "방금" : "now") : `${hoursAgo}h`;

          return (
            <div
              key={story.id}
              className="flex flex-col items-center gap-1 shrink-0 w-16"
            >
              {/* Avatar ring */}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-400/40 bg-white/[0.06]">
                <span className="text-lg">{MOOD_EMOJI[story.mood]}</span>
                <span className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-black/80 rounded-full px-1 border border-white/10">
                  {timeLabel}
                </span>
              </div>

              {/* Name */}
              <span className="text-[10px] text-white/60 truncate w-full text-center">
                {story.creatureName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
