"use client";

import { useEffect, useState, useCallback } from "react";
import { BottomNav } from "@/components/bottom-nav";

type ActivityItem = {
  id: string;
  kind: "log" | "artifact";
  action_type?: string;
  summary?: string;
  type?: string;
  content?: string;
  created_at: string;
  expires_at?: string;
  is_preserved?: boolean;
  is_public?: boolean;
};

const TYPE_TABS = [
  { key: "all", label: "전체" },
  { key: "dream", label: "꿈" },
  { key: "creation", label: "창작" },
  { key: "image", label: "이미지" },
  { key: "music", label: "음악" },
  { key: "comic", label: "만화" },
];

const ACTION_ICONS: Record<string, string> = {
  heartbeat: "♡",
  dream_journal: "◎",
  poem: "✦",
  diary: "◈",
  unsent_letter: "◉",
  will: "◆",
  image: "◐",
  emotion_image: "◑",
  music: "◈",
  comic: "◭",
  video: "▷",
  coins_add: "◎",
  social_encounter: "◇",
  species_emergence: "✧",
  default: "·",
};

function getIcon(item: ActivityItem) {
  if (item.kind === "artifact") return ACTION_ICONS[item.type || ""] ?? ACTION_ICONS.default;
  return ACTION_ICONS[item.action_type || ""] ?? ACTION_ICONS.default;
}

function getLabel(item: ActivityItem) {
  if (item.kind === "artifact") {
    const labels: Record<string, string> = {
      poem: "시",
      diary: "일기",
      unsent_letter: "보내지 못한 편지",
      will: "유언",
      dream_journal: "꿈 일기",
      image: "이미지",
      emotion_image: "감정 이미지",
      music: "음악",
      comic: "만화",
      video: "영상",
      fairytale: "동화",
    };
    return labels[item.type || ""] || item.type || "창작물";
  }
  const labels: Record<string, string> = {
    heartbeat: "자율 활동",
    social_encounter: "소셜 만남",
    coins_add: "코인 획득",
    species_emergence: "종 발현",
    proactive_message: "먼저 말 걸기",
  };
  return labels[item.action_type || ""] || item.action_type || "활동";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (tab: string) => {
    setLoading(true);
    const res = await fetch(`/api/activity?type=${tab}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  async function togglePreserve(id: string, current: boolean) {
    await fetch(`/api/artifacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_preserved: !current }),
    });
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, is_preserved: !current } : item));
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-xl border-b border-white/5 px-4 pt-14 pb-0">
        <h1 className="text-lg font-light tracking-wider mb-4">활동</h1>
        <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-hide">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-all ${
                activeTab === tab.key
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center pt-20">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center pt-20 text-white/30 text-sm">
            <p>아직 활동이 없습니다</p>
            <p className="mt-2 text-xs">AI가 자율적으로 활동하면 여기에 기록됩니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden"
              >
                <button
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  <span className="text-white/30 text-lg leading-none mt-0.5 w-5 flex-shrink-0 text-center">
                    {getIcon(item)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white/80 font-light">{getLabel(item)}</span>
                      <span className="text-xs text-white/25 flex-shrink-0">{timeAgo(item.created_at)}</span>
                    </div>
                    {(item.summary || item.content) && (
                      <p className="text-xs text-white/40 mt-1 line-clamp-1">
                        {item.summary || item.content}
                      </p>
                    )}
                  </div>
                </button>

                {expanded === item.id && (item.content || item.summary) && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    <p className="text-sm text-white/60 mt-3 leading-relaxed whitespace-pre-wrap">
                      {item.content || item.summary}
                    </p>
                    {item.kind === "artifact" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => togglePreserve(item.id, !!item.is_preserved)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            item.is_preserved
                              ? "border-amber-400/40 text-amber-400/80 bg-amber-400/5"
                              : "border-white/10 text-white/40 hover:border-white/20"
                          }`}
                        >
                          {item.is_preserved ? "★ 보존됨" : "☆ 보존하기"}
                        </button>
                        {item.expires_at && !item.is_preserved && (
                          <span className="text-xs text-white/25 self-center">
                            {new Date(item.expires_at) > new Date()
                              ? `${Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000)}일 후 사라짐`
                              : "만료됨"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
