"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActiveStories,
  type CreatureStory,
  type StoryMood,
} from "@/lib/social/creature-stories";

const MOOD_OPTIONS: { value: StoryMood; emoji: string }[] = [
  { value: "happy", emoji: "😊" },
  { value: "excited", emoji: "🤩" },
  { value: "playful", emoji: "😜" },
  { value: "curious", emoji: "🤔" },
  { value: "calm", emoji: "😌" },
  { value: "sad", emoji: "😢" },
  { value: "anxious", emoji: "😰" },
  { value: "tired", emoji: "😴" },
  { value: "neutral", emoji: "😐" },
];

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

  // Publish form state
  const [showPublish, setShowPublish] = useState(false);
  const [publishName, setPublishName] = useState("");
  const [publishContent, setPublishContent] = useState("");
  const [publishMood, setPublishMood] = useState<StoryMood>("happy");
  const [publishing, setPublishing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Fetch stories from API with localStorage fallback
  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/social/stories");
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json() as { stories?: Array<{ id: string; creature_name: string; content: string; mood: StoryMood; created_at: string; expires_at: string }> };
      // Map API shape (snake_case) to CreatureStory shape (camelCase)
      const mapped: CreatureStory[] = (json.stories ?? []).map((s) => ({
        id: s.id,
        creatureName: s.creature_name,
        content: s.content,
        mood: s.mood,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
      }));
      setStories(mapped);
    } catch {
      // Fallback to localStorage
      setStories(getActiveStories());
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Focus name input when publish form opens
  useEffect(() => {
    if (showPublish) {
      nameInputRef.current?.focus();
    }
  }, [showPublish]);

  const handlePublish = async () => {
    if (!publishName.trim() || !publishContent.trim()) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/social/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creature_name: publishName.trim(),
          content: publishContent.trim(),
          mood: publishMood,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      // Reset form and refresh stories
      setPublishName("");
      setPublishContent("");
      setPublishMood("happy");
      setShowPublish(false);
      await fetchStories();
    } catch {
      // Silently fail — user can retry
    } finally {
      setPublishing(false);
    }
  };

  if (stories.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
        <h3 className="text-sm font-semibold text-white/80 mb-2">
          {isKo ? "크리처 스토리" : "Creature Stories"}
        </h3>

        {/* Publish mini-form */}
        {showPublish && (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
            <input
              ref={nameInputRef}
              type="text"
              value={publishName}
              onChange={(e) => setPublishName(e.target.value)}
              placeholder={isKo ? "크리처 이름" : "Creature name"}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-cyan-400/40"
            />
            <input
              type="text"
              value={publishContent}
              onChange={(e) => setPublishContent(e.target.value)}
              placeholder={isKo ? "스토리 내용..." : "Story content..."}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-cyan-400/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !publishing) handlePublish();
              }}
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPublishMood(m.value)}
                  className={`text-sm rounded-full px-1 py-0.5 transition-colors ${
                    publishMood === m.value
                      ? "bg-cyan-400/20 ring-1 ring-cyan-400/50"
                      : "hover:bg-white/10"
                  }`}
                  title={m.value}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowPublish(false)}
                className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                {isKo ? "취소" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || !publishName.trim() || !publishContent.trim()}
                className="rounded-lg bg-cyan-400/20 px-2.5 py-1 text-[10px] font-medium text-cyan-300 hover:bg-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {publishing
                  ? (isKo ? "게시 중..." : "Posting...")
                  : (isKo ? "게시" : "Post")}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 py-3">
          <button
            type="button"
            onClick={() => setShowPublish((prev) => !prev)}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-cyan-400/30 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-400/50 transition-colors"
            aria-label={isKo ? "스토리 추가" : "Add story"}
          >
            <span className="text-lg text-cyan-400/70">+</span>
          </button>
          <p className="text-xs text-white/40 text-center">
            {isKo ? "첫 스토리를 게시해보세요" : "Publish your first story"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
      <h3 className="text-sm font-semibold text-white/80 mb-3">
        {isKo ? "크리처 스토리" : "Creature Stories"}
        <span className="ml-1.5 text-[10px] font-normal text-white/40">24h</span>
      </h3>

      {/* Publish mini-form */}
      {showPublish && (
        <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
          <input
            ref={nameInputRef}
            type="text"
            value={publishName}
            onChange={(e) => setPublishName(e.target.value)}
            placeholder={isKo ? "크리처 이름" : "Creature name"}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-cyan-400/40"
          />
          <input
            type="text"
            value={publishContent}
            onChange={(e) => setPublishContent(e.target.value)}
            placeholder={isKo ? "스토리 내용..." : "Story content..."}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-cyan-400/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !publishing) handlePublish();
            }}
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPublishMood(m.value)}
                className={`text-sm rounded-full px-1 py-0.5 transition-colors ${
                  publishMood === m.value
                    ? "bg-cyan-400/20 ring-1 ring-cyan-400/50"
                    : "hover:bg-white/10"
                }`}
                title={m.value}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowPublish(false)}
              className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              {isKo ? "취소" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !publishName.trim() || !publishContent.trim()}
              className="rounded-lg bg-cyan-400/20 px-2.5 py-1 text-[10px] font-medium text-cyan-300 hover:bg-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {publishing
                ? (isKo ? "게시 중..." : "Posting...")
                : (isKo ? "게시" : "Post")}
            </button>
          </div>
        </div>
      )}

      {/* Horizontal scrollable story bubbles */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {/* Publish button */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-16">
          <button
            type="button"
            onClick={() => setShowPublish((prev) => !prev)}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-cyan-400/30 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-400/50 transition-colors"
            aria-label={isKo ? "스토리 추가" : "Add story"}
          >
            <span className="text-lg text-cyan-400/70">+</span>
          </button>
          <span className="text-[10px] text-white/40 truncate w-full text-center">
            {isKo ? "추가" : "Add"}
          </span>
        </div>

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
