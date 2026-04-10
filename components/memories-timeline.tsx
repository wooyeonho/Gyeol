"use client";

import { motion } from "framer-motion";

interface Memory {
  id: string;
  content: string;
  created_at: string;
  emotion?: string | null;
  importance?: number | null;
}

interface MemoriesTimelineProps {
  memories: Memory[];
}

const EMOTION_EMOJI: Record<string, string> = {
  joy: "😊", happy: "😄", sad: "😢", curious: "🤔",
  excited: "🎉", calm: "😌", love: "💖", fear: "😨",
  anger: "😠", surprise: "😲", neutral: "💬",
};

function formatDate(iso: string, locale = "ko") {
  const d = new Date(iso);
  if (locale === "ko") {
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function groupByDate(memories: Memory[]) {
  const groups: Record<string, Memory[]> = {};
  for (const m of memories) {
    const dateKey = m.created_at.slice(0, 10);
    (groups[dateKey] ??= []).push(m);
  }
  return groups;
}

export function MemoriesTimeline({ memories }: MemoriesTimelineProps) {
  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-5xl">⭐</span>
        <p className="text-sm text-white/40">아직 쌓인 기억이 없어요</p>
        <p className="text-xs text-white/25">크리처와 대화하면 기억이 쌓이기 시작해요</p>
      </div>
    );
  }

  const grouped = groupByDate(memories);

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-white/8" />

      <div className="space-y-8">
        {Object.entries(grouped).map(([date, dayMemories], groupIdx) => (
          <div key={date}>
            {/* Date label */}
            <motion.div
              className="relative mb-4 flex items-center gap-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: groupIdx * 0.04 }}
            >
              <div className="h-2 w-2 rounded-full bg-white/30 ring-2 ring-[#0a0a0f] ring-offset-0 z-10" style={{ marginLeft: "12px" }} />
              <span className="text-xs font-semibold text-white/40">{formatDate(date)}</span>
            </motion.div>

            {/* Memories for this date */}
            <div className="ml-9 space-y-2">
              {dayMemories.map((memory, idx) => {
                const emotionKey = (memory.emotion ?? "neutral").toLowerCase();
                const emoji = EMOTION_EMOJI[emotionKey] ?? "💬";
                const importance = memory.importance ?? 0;

                return (
                  <motion.div
                    key={memory.id}
                    className={`rounded-xl border p-3 ${
                      importance >= 8
                        ? "border-amber-400/30 bg-amber-400/5"
                        : importance >= 5
                        ? "border-white/10 bg-white/[0.05]"
                        : "border-white/[0.06] bg-white/[0.03]"
                    }`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIdx * 0.04 + idx * 0.02 }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg leading-tight">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 leading-relaxed line-clamp-3">
                          {memory.content}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] text-white/25">
                            {new Date(memory.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {importance >= 8 && (
                            <span className="text-[10px] text-amber-400/70 font-medium">⭐ 핵심 기억</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
