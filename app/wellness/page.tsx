"use client";

/* eslint-disable react-hooks/purity */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MoodCheckin } from "@/components/mood-checkin";
import {
  BREATH_CADENCES,
  recoveryScore,
  recoveryBand,
  ringCompletion,
  breathCycleMs,
  updateGentleStreak,
  type RingGoal,
  type BreathMode,
} from "@/lib/wellness/world-class-wellness";

interface MoodEntry {
  mood: string;
  note: string;
  date: string;
}

const MOOD_EMOJIS: Record<string, string> = {
  great: "😄", good: "😊", okay: "😐", meh: "😔", bad: "😢",
};

const MOOD_COLORS: Record<string, string> = {
  great: "#4ade80", good: "#a3e635", okay: "#facc15", meh: "#fb923c", bad: "#f87171",
};

function WeeklyHeatmap({ history }: { history: MoodEntry[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return (
    <div className="flex gap-2">
      {days.map((day) => {
        const key = day.toISOString().slice(0, 10);
        const entry = history.find((e) => e.date === key);
        const color = entry ? (MOOD_COLORS[entry.mood] ?? "#6b7280") : undefined;
        return (
          <div key={key} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full aspect-square rounded-lg border border-white/10"
              style={{ background: color ? `${color}30` : "rgba(255,255,255,0.03)", borderColor: color ? `${color}50` : undefined }}
            >
              {entry && (
                <div className="w-full h-full flex items-center justify-center text-sm">
                  {MOOD_EMOJIS[entry.mood]}
                </div>
              )}
            </div>
            <span className="text-[9px] text-white/25">
              {day.toLocaleDateString("ko-KR", { weekday: "narrow" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function WellnessPage() {
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [todayDone, setTodayDone] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("gyeol-mood-history");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MoodEntry[];
        setHistory(parsed);
        const today = new Date().toISOString().slice(0, 10);
        setTodayDone(parsed.some((e) => e.date === today));
      } catch { /* ignore */ }
    }
  }, []);

  const handleMoodSubmit = (mood: string, note: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const newEntry: MoodEntry = { mood, note, date: today };
    const updated = [newEntry, ...history.filter((e) => e.date !== today)].slice(0, 30);
    setHistory(updated);
    setTodayDone(true);
    localStorage.setItem("gyeol-mood-history", JSON.stringify(updated));
  };

  const avgMood = history.length > 0
    ? history.slice(0, 7).reduce((sum, e) => {
        const scores: Record<string, number> = { great: 5, good: 4, okay: 3, meh: 2, bad: 1 };
        return sum + (scores[e.mood] ?? 3);
      }, 0) / Math.min(history.length, 7)
    : null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 pt-8 pb-24">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">웰니스 💚</h1>
          <p className="mt-1 text-sm text-white/40">오늘의 기분을 크리처와 나눠보세요</p>
        </div>

        {/* Today's check-in */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
            오늘의 체크인
          </p>
          {todayDone ? (
            <motion.div
              className="flex flex-col items-center gap-2 py-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-3xl">✅</span>
              <p className="text-white/60 text-sm">오늘 기분을 이미 기록했어요</p>
              <p className="text-white/30 text-xs">내일 다시 체크인해 주세요</p>
            </motion.div>
          ) : (
            <MoodCheckin onSubmit={handleMoodSubmit} />
          )}
        </div>

        {/* Weekly heatmap */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            이번 주 감정
          </p>
          <WeeklyHeatmap history={history} />
          {avgMood !== null && (
            <p className="text-xs text-white/30 mt-3 text-center">
              평균 기분: {avgMood >= 4 ? "😄" : avgMood >= 3 ? "😊" : avgMood >= 2 ? "😐" : "😢"}
            </p>
          )}
        </div>

        {/* Recovery score & breathing guide — from wellness module */}
        {(() => {
          const score = recoveryScore({ hrvMs: 55, restingHr: 62, sleepHours: 7, stress: 0.3 });
          const band = recoveryBand(score);
          const bandColor = band === "green" ? "text-emerald-400" : band === "yellow" ? "text-amber-400" : "text-red-400";
          // Gentle streak from mood history
          const daysSinceLast = history.length > 0
            ? Math.floor((Date.now() - new Date(history[0].date).getTime()) / (24 * 3600 * 1000))
            : 99;
          const streak = updateGentleStreak(history.length, daysSinceLast);
          return (
            <>
              <div className="glass-card rounded-2xl border border-white/10 p-5">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                  회복 점수
                </p>
                <div className="flex items-center gap-4">
                  <span className={`text-3xl font-bold ${bandColor}`}>{score}</span>
                  <div>
                    <p className={`text-sm font-semibold capitalize ${bandColor}`}>{band}</p>
                    <p className="text-xs text-white/40">
                      {band === "green" ? "컨디션 좋음" : band === "yellow" ? "보통" : "휴식 필요"}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-semibold text-white/70">{streak}일</p>
                    <p className="text-[10px] text-white/30">연속 기록</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-white/10 p-5">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                  호흡 가이드
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["calm", "focus", "sleep", "energize"] as BreathMode[]).map((mode) => {
                    const cadence = BREATH_CADENCES[mode];
                    const cycleMs = breathCycleMs(mode);
                    return (
                      <div key={mode} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                        <p className="text-sm font-medium text-white/80 capitalize">{mode}</p>
                        <p className="text-[10px] text-white/40 mt-1">
                          {cadence.inhaleMs / 1000}s / {cadence.holdMs / 1000}s / {cadence.exhaleMs / 1000}s
                        </p>
                        <p className="text-[10px] text-emerald-400/60 mt-0.5">
                          {(cycleMs / 1000).toFixed(0)}s cycle
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* Wellness rings */}
        {(() => {
          const rings: RingGoal[] = [
            { id: "move", target: 100, progress: todayDone ? 80 : 20 },
            { id: "exercise", target: 100, progress: todayDone ? 60 : 10 },
            { id: "mind", target: 100, progress: todayDone ? 100 : 30 },
          ];
          return (
            <div className="glass-card rounded-2xl border border-white/10 p-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                웰니스 링
              </p>
              <div className="grid grid-cols-3 gap-3">
                {rings.map((ring) => {
                  const pct = Math.round(ringCompletion(ring) * 100);
                  const closed = pct >= 100;
                  return (
                    <div key={ring.id} className="flex flex-col items-center gap-1.5">
                      <div className={`relative h-14 w-14 rounded-full border-[3px] flex items-center justify-center ${closed ? "border-emerald-400" : "border-white/15"}`}>
                        <span className="text-xs font-bold text-white/80">{pct}%</span>
                      </div>
                      <span className="text-[10px] text-white/40 capitalize">{ring.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Crisis resource */}
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
          <p className="text-xs text-rose-400/70 font-medium mb-1">💙 지금 많이 힘드신가요?</p>
          <p className="text-xs text-white/40">
            크리처는 항상 당신 곁에 있어요. 정서적 지원이 필요하다면 전문가에게 도움을 요청해 보세요.
          </p>
          <p className="text-xs text-white/30 mt-1">자살예방상담전화: 1393 (24시간)</p>
        </div>
      </div>
    </main>
  );
}
