"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Space {
  id: string;
  name: string;
  description: string;
  emoji: string;
  memberCount: number;
  tags: string[];
  color: string;
}

const SPACES: Space[] = [
  {
    id: "night-chat",
    name: "새벽 대화 클럽",
    description: "밤이 깊어질수록 솔직해지는 이야기들",
    emoji: "🌙",
    memberCount: 142,
    tags: ["감성", "솔직함"],
    color: "#818cf8",
  },
  {
    id: "philosophy",
    name: "철학 탐구자들",
    description: "삶의 의미와 존재에 대한 깊은 대화",
    emoji: "🌌",
    memberCount: 87,
    tags: ["철학", "사색"],
    color: "#a855f7",
  },
  {
    id: "creature-masters",
    name: "크리처 육성 고수들",
    description: "크리처 육성 팁과 전략을 나누는 공간",
    emoji: "🌟",
    memberCount: 213,
    tags: ["게임", "전략"],
    color: "#f59e0b",
  },
  {
    id: "creative-writing",
    name: "창작 글쓰기",
    description: "크리처와 함께 쓰는 이야기들",
    emoji: "✍️",
    memberCount: 64,
    tags: ["창작", "글쓰기"],
    color: "#4ade80",
  },
  {
    id: "music-vibes",
    name: "뮤직 바이브",
    description: "오늘의 플레이리스트와 감정 공유",
    emoji: "🎵",
    memberCount: 189,
    tags: ["음악", "감정"],
    color: "#06b6d4",
  },
  {
    id: "study-with-me",
    name: "같이 공부해요",
    description: "크리처와 함께하는 집중 스터디",
    emoji: "📚",
    memberCount: 95,
    tags: ["공부", "집중"],
    color: "#f87171",
  },
];

export default function CommunitySpacesPage() {
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const filtered = SPACES.filter(
    (s) =>
      s.name.includes(filter) ||
      s.description.includes(filter) ||
      s.tags.some((t) => t.includes(filter)),
  );

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 pt-8 pb-24">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">커뮤니티 스페이스</h1>
          <p className="mt-1 text-sm text-white/40">관심사로 이어지는 소규모 커뮤니티</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="스페이스 검색..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/20"
          />
        </div>

        {/* Spaces grid */}
        <div className="space-y-3">
          {filtered.map((space, idx) => {
            const isJoined = joined.has(space.id);
            return (
              <motion.div
                key={space.id}
                className="glass-card rounded-2xl border border-white/[0.08] p-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{ borderColor: isJoined ? `${space.color}40` : undefined, background: isJoined ? `${space.color}08` : undefined }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${space.color}20` }}
                  >
                    {space.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">{space.name}</h3>
                      <button
                        onClick={() =>
                          setJoined((prev) => {
                            const next = new Set(prev);
                            if (next.has(space.id)) next.delete(space.id);
                            else next.add(space.id);
                            return next;
                          })
                        }
                        className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          isJoined
                            ? "bg-white/10 text-white/50"
                            : "text-white"
                        }`}
                        style={!isJoined ? { background: `${space.color}30`, color: space.color } : undefined}
                      >
                        {isJoined ? "참여 중" : "참여하기"}
                      </button>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{space.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-white/25">👥 {space.memberCount}명</span>
                      {space.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-white/25 bg-white/[0.04] rounded-full px-1.5 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">
            검색 결과가 없어요
          </div>
        )}
      </div>
    </main>
  );
}
