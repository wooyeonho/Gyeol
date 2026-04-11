"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { MoodGraph } from "@/components/engagement/mood-graph";
import { LevelBar } from "@/components/engagement/level-bar";
import { useAgentStore } from "@/store/agent-store";
import type { MoodWeekResponse } from "@/app/api/dashboard/mood-week/route";
import { getMoodEmoji } from "@/lib/diary/creature-diary";

const WEEKLY_LABEL_META: Record<
  string,
  { ko: string; emoji: string; color: string }
> = {
  radiant: { ko: "눈부신 한 주", emoji: "🌟", color: "text-amber-300" },
  bright:  { ko: "밝은 한 주",   emoji: "☀️", color: "text-emerald-300" },
  neutral: { ko: "잔잔한 한 주", emoji: "🌤️", color: "text-sky-300" },
  dim:     { ko: "흐린 한 주",   emoji: "🌫️", color: "text-slate-300" },
  heavy:   { ko: "무거운 한 주", emoji: "🌧️", color: "text-indigo-300" },
};

/**
 * Phase 2-2: Emotion visualization dashboard.
 *
 * Surfaces the creature's inner emotional landscape in three layers:
 *   1. Instant vibe card  — big weekly emoji + label
 *   2. 14-day mood graph  — valence bars with diary tooltips
 *   3. Relationship metrics — intimacy bar, level bar, top moods
 */
export default function EmotionDashboardPage() {
  const engagement = useAgentStore((s) => s.engagement);
  const agentState = useAgentStore((s) => s.agentState);
  const [data, setData] = useState<MoodWeekResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/mood-week");
        if (!res.ok) {
          setError("dashboard_load_failed");
          return;
        }
        const json = (await res.json()) as MoodWeekResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("dashboard_load_failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weeklyMeta = data ? WEEKLY_LABEL_META[data.weekly_label] ?? WEEKLY_LABEL_META.neutral : null;
  const intimacyPct = data?.intimacy != null
    ? Math.min(100, Math.max(0, Math.round(data.intimacy * 100)))
    : null;

  return (
    <main className="min-h-screen bg-[#07070b] px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-5">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">Emotion Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">감정 대시보드</h1>
          <p className="mt-1 text-sm text-white/40">
            {agentState?.self_name ?? "크리처"}의 2주간의 마음
          </p>
        </header>

        {/* Weekly vibe card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-950/70 p-6 text-center shadow-[0_0_80px_rgba(56,189,248,0.12)]"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/5" />
              <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
            </div>
          ) : error ? (
            <p className="text-sm text-rose-300/70">대시보드를 불러오지 못했어요</p>
          ) : weeklyMeta ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">This Week</p>
              <motion.div
                className="mt-3 text-5xl"
                initial={{ scale: 0.6, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
              >
                {weeklyMeta.emoji}
              </motion.div>
              <p className={`mt-3 text-lg font-semibold ${weeklyMeta.color}`}>
                {weeklyMeta.ko}
              </p>
              <p className="mt-1 text-xs text-white/40">
                평균 감정 지수 {(data?.weekly_average ?? 0).toFixed(2)}
              </p>
            </>
          ) : null}
        </motion.div>

        {/* Mood graph */}
        {data && data.days.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
          >
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">2주 감정 흐름</h2>
              <div className="flex items-center gap-3 text-[10px] text-white/40">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" /> 긍정 {data.positive_count}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-300" /> 중립 {data.neutral_count}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-300" /> 부정 {data.negative_count}
                </span>
              </div>
            </header>
            <MoodGraph days={data.days} />
          </motion.section>
        )}

        {/* Intimacy */}
        {intimacyPct != null && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">친밀도</h2>
              <span className="text-xs font-semibold text-rose-300">{intimacyPct}%</span>
            </header>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 via-pink-400 to-fuchsia-400"
                initial={{ width: 0 }}
                animate={{ width: `${intimacyPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/40">
              매일의 대화, 돌봄, 선물이 이 막대를 채워요.
            </p>
          </motion.section>
        )}

        {/* Level / streak */}
        {engagement && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-white">나의 레벨</h2>
            <LevelBar
              level={engagement.level}
              xpIntoLevel={engagement.xpIntoLevel}
              xpForNext={engagement.xpForNext}
            />
            <div className="mt-3 flex items-center gap-4 text-[11px] text-white/50">
              <span>🔥 연속 {engagement.currentStreak}일</span>
              <span>🏆 최고 {engagement.longestStreak}일</span>
              <span>🛡️ 실드 {engagement.shieldCount}</span>
            </div>
          </motion.section>
        )}

        {/* Top moods */}
        {data && data.dominant_moods.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-white">가장 자주 느낀 감정</h2>
            <div className="flex flex-wrap gap-2">
              {data.dominant_moods.map((m) => (
                <span
                  key={m.mood}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75"
                >
                  <span className="text-sm">{getMoodEmoji(m.mood)}</span>
                  <span className="capitalize">{m.mood}</span>
                  <span className="text-white/40">×{m.count}</span>
                </span>
              ))}
            </div>
          </motion.section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
