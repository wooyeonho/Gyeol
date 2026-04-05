"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import type { DiaryEntry } from "@/lib/diary/creature-diary";

export default function DiaryPage() {
  const { t, locale } = useTranslations();
  const dayHeaders = (() => {
    switch (locale) {
      case "ko": return ["일", "월", "화", "수", "목", "금", "토"];
      case "ja": return ["日", "月", "火", "水", "木", "金", "土"];
      case "zh": return ["日", "一", "二", "三", "四", "五", "六"];
      case "es": return ["D", "L", "M", "X", "J", "V", "S"];
      default:   return ["S", "M", "T", "W", "T", "F", "S"];
    }
  })();
  const agentState = useAgentStore((s) => s.agentState);
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | undefined;

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchDiary = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/diary?agentId=${agentId}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId, month]);

  useEffect(() => { fetchDiary(); }, [fetchDiary]);

  // Build calendar grid
  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const entryMap = new Map(entries.map((e) => [e.date, e]));

  const prevMonth = () => {
    const d = new Date(year, mon - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const d = new Date(year, mon, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">
            {t("diary.eyebrow") || "Diary"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("diary.title") || "감정 일기"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("diary.subtitle") || "매일 생명체가 쓰는 한 줄 일기"}
          </p>
        </header>

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={prevMonth} className="rounded-full p-2 text-white/50 hover:bg-white/5">
            ←
          </button>
          <span className="text-sm font-medium text-white/70">
            {year}. {String(mon).padStart(2, "0")}
          </span>
          <button type="button" onClick={nextMonth} className="rounded-full p-2 text-white/50 hover:bg-white/5">
            →
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          </div>
        ) : (
          <>
            {/* Calendar grid */}
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayHeaders.map((d, i) => (
                  <div key={`day-${i}`} className="text-center text-xs text-white/30">{d}</div>
                ))}
              </div>
              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const entry = entryMap.get(dateStr);
                  const isToday = dateStr === new Date().toISOString().slice(0, 10);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => entry && setSelectedEntry(entry)}
                      className={`relative flex flex-col items-center justify-center rounded-xl p-1.5 text-xs transition-all ${
                        entry
                          ? "bg-indigo-500/15 border border-indigo-400/20 cursor-pointer hover:bg-indigo-500/25"
                          : "text-white/20"
                      } ${isToday ? "ring-1 ring-indigo-400/40" : ""}`}
                    >
                      <span className={entry ? "text-white/80" : "text-white/20"}>{day}</span>
                      {entry && <span className="text-sm leading-none">{entry.moodEmoji}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected entry detail */}
            {selectedEntry && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{selectedEntry.moodEmoji}</span>
                  <div>
                    <p className="text-xs text-white/40">{selectedEntry.date}</p>
                    <p className="text-xs text-indigo-300">{selectedEntry.mood}</p>
                  </div>
                </div>
                <p className="text-sm text-white/80 leading-relaxed italic">
                  &ldquo;{selectedEntry.summary}&rdquo;
                </p>
              </motion.div>
            )}

            {/* Recent entries list */}
            {entries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/70">
                  {t("diary.recentEntries") || "최근 일기"}
                </h3>
                {entries.slice(0, 7).map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                  >
                    <span className="text-xl">{entry.moodEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 line-clamp-1">{entry.summary}</p>
                      <p className="text-xs text-white/25">{entry.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {entries.length === 0 && (
              <p className="text-center text-sm text-white/30 py-8">
                {t("diary.noEntries") || "아직 일기가 없어요. 생명체가 곧 첫 일기를 쓸 거예요!"}
              </p>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
