"use client";

import { useEffect, useState } from "react";
import { SpringCard } from "@/components/ui/spring-card";
import { SkeletonFeedCard } from "@/components/ui/skeleton";
import { NewPostsPill } from "@/components/social/new-posts-pill";
import { RichPresenceBadge, type PresenceActivity } from "@/components/social/rich-presence-badge";
import { useHeartBurst, HeartBurstOverlay } from "@/components/effects/heart-burst";

type Tab = "all" | "friends" | "ai";

interface FeedEvent {
  id: string;
  agent_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  agent?: {
    custom_name?: string;
    species?: string;
    level?: number;
  } | null;
}

const SPECIES_EMOJI: Record<string, string> = {
  fluff: "🐣", ember: "🔥", aqua: "💧", terra: "🌿",
  spark: "⚡", void: "🌑", prism: "🌈",
};

const EVENT_LABELS: Record<string, { ko: string; emoji: string }> = {
  level_up: { ko: "레벨업 달성", emoji: "⬆️" },
  evolution: { ko: "진화 완료", emoji: "🌟" },
  streak_milestone: { ko: "스트릭 달성", emoji: "🔥" },
  memory_created: { ko: "새 기억 생성", emoji: "💭" },
  achievement: { ko: "업적 달성", emoji: "🏆" },
  birthday: { ko: "생일 기념", emoji: "🎂" },
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostCount, setNewPostCount] = useState(0);
  const { particles, burst } = useHeartBurst();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/feed?tab=${tab}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { setEvents(d.events ?? []); setLoading(false); setNewPostCount(0); })
      .catch(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tab]);

  const loadFeed = () => {
    setEvents([]);
    setLoading(true);
    fetch(`/api/feed?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => { setEvents(d.events ?? []); setLoading(false); setNewPostCount(0); })
      .catch(() => setLoading(false));
  };

  // Poll for new posts every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/feed?tab=${tab}&after=${events[0]?.created_at ?? ""}`)
        .then((r) => r.json())
        .then((d) => {
          const count = (d.events ?? []).length;
          if (count > 0) setNewPostCount((prev) => prev + count);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [tab, events]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "all", label: "전체", icon: "🌍" },
    { key: "friends", label: "친구", icon: "👥" },
    { key: "ai", label: "AI 추천", icon: "✨" },
  ];

  const inferActivity = (eventType: string): PresenceActivity => {
    if (eventType === "level_up" || eventType === "evolution") return "evolving";
    if (eventType === "memory_created") return "chatting";
    if (eventType === "achievement") return "exploring";
    return "idle";
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 pt-8 pb-24">
      <NewPostsPill count={newPostCount} onClick={loadFeed} />
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">피드 📰</h1>
          <p className="mt-1 text-sm text-white/40">크리처들의 활동을 확인하세요</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-white/[0.05] border border-white/10 p-1 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setLoading(true); setTab(t.key); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                tab === t.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Feed content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonFeedCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🌌</p>
            <p className="text-white/40 text-sm">
              {tab === "friends" ? "팔로우한 크리처가 없어요" : "아직 활동이 없어요"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => {
              const info = EVENT_LABELS[event.event_type] ?? { ko: event.event_type, emoji: "💫" };
              const species = event.agent?.species ?? "fluff";
              const speciesEmoji = SPECIES_EMOJI[species] ?? "✨";
              const name = event.agent?.custom_name ?? "크리처";
              const level = event.agent?.level ?? 1;
              return (
                  <SpringCard
                    key={event.id}
                    className="glass-card flex items-start gap-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                    {speciesEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-white">{name}</span>
                      <span className="text-[10px] text-white/30">Lv.{level}</span>
                      <RichPresenceBadge activity={inferActivity(event.event_type)} />
                    </div>
                    <p className="text-sm text-white/60 mt-0.5">
                      {info.emoji} {info.ko}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] text-white/25">{timeAgo(event.created_at)}</p>
                      <button
                        type="button"
                        className="relative text-[10px] text-white/30 hover:text-rose-400 transition-colors"
                        onClick={(e) => { e.stopPropagation(); burst(e); }}
                      >
                        ❤ 좋아요
                        <HeartBurstOverlay particles={particles} />
                      </button>
                    </div>
                  </div>
                </SpringCard>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
