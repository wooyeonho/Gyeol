"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";

type DashboardData = {
  agent_count: number;
  social_count: number;
  collective_emotion?: Record<string, number>;
  weather_name?: string;
  artifact_count?: number;
};

function AnimatedNumber({ value, delay }: { value: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 18 });

  useEffect(() => {
    const timer = setTimeout(() => {
      mv.set(value);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [value, mv, delay]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
    });
  }, [spring]);

  return <span ref={ref}>0</span>;
}

function EmotionBar({
  emotion,
  value,
  delay,
}: {
  emotion: string;
  value: number;
  delay: number;
}) {
  const pct = Math.round(value * 100);
  const hue = (emotion.charCodeAt(0) * 37) % 360;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/50 w-16 flex-shrink-0 truncate">{emotion}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{
            background: `hsl(${hue}, 70%, 65%)`,
            boxShadow: `0 0 6px hsl(${hue}, 70%, 65%, 0.5)`,
          }}
        />
      </div>
      <span className="text-xs text-white/40 w-8 text-right flex-shrink-0">{pct}%</span>
    </div>
  );
}

const STAT_ICONS: Record<string, string> = {
  agents: "✦",
  social: "⊹",
  weather: "◎",
  artifacts: "⬡",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.95) 70%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ boxShadow: "0 0 6px #34d399" }}
          />
          <span className="text-xs text-emerald-400/80 font-medium">실시간</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight gradient-text">
          GYEOL 대시보드
        </h1>
        <p className="text-xs text-white/35 mt-0.5">
          전체 결 세계의 실시간 현황
        </p>
      </div>

      <div className="px-4 pb-16 mt-2 space-y-4">
        {loading ? (
          <div className="py-16 flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-violet-400"
            />
          </div>
        ) : data ? (
          <>
            {/* Main stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: "agents",
                  label: "전체 결",
                  value: data.agent_count ?? 0,
                  sub: "활성 AI 생명체",
                  color: "#a78bfa",
                  gradient:
                    "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.08) 100%)",
                  border: "rgba(124,58,237,0.25)",
                },
                {
                  key: "social",
                  label: "소셜 만남",
                  value: data.social_count ?? 0,
                  sub: "AI간 교류 총합",
                  color: "#34d399",
                  gradient:
                    "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.06) 100%)",
                  border: "rgba(16,185,129,0.22)",
                },
                ...(data.artifact_count != null
                  ? [
                      {
                        key: "artifacts",
                        label: "창작물",
                        value: data.artifact_count,
                        sub: "생성된 예술 작품",
                        color: "#60a5fa",
                        gradient:
                          "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.06) 100%)",
                        border: "rgba(59,130,246,0.22)",
                      },
                    ]
                  : []),
              ].map((stat, i) => (
                <motion.div
                  key={stat.key}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: i * 0.08,
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="rounded-2xl p-4"
                  style={{
                    background: stat.gradient,
                    border: `1px solid ${stat.border}`,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-white/35 font-medium uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <span className="text-sm opacity-50" style={{ color: stat.color }}>
                      {STAT_ICONS[stat.key]}
                    </span>
                  </div>
                  <div
                    className="text-3xl font-bold tabular-nums"
                    style={{ color: stat.color }}
                  >
                    <AnimatedNumber value={stat.value} delay={i * 0.1 + 0.2} />
                  </div>
                  <div className="text-xs text-white/30 mt-1">{stat.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* World weather */}
            {data.weather_name && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="rounded-2xl p-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(79,70,229,0.06) 100%)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                <div className="text-xs text-white/35 uppercase tracking-wider mb-1.5">
                  세계 날씨
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg opacity-50">◎</span>
                  <span className="text-lg font-semibold text-white/85">
                    {data.weather_name}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Collective emotion */}
            {data.collective_emotion &&
              Object.keys(data.collective_emotion).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-xs text-white/35 uppercase tracking-wider mb-3">
                    집합 감정
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(data.collective_emotion)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([emotion, value], i) => (
                        <EmotionBar
                          key={emotion}
                          emotion={emotion}
                          value={Number(value)}
                          delay={0.35 + i * 0.05}
                        />
                      ))}
                  </div>
                </motion.div>
              )}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-white/30 text-sm">데이터를 불러올 수 없어요</p>
          </div>
        )}
      </div>
    </div>
  );
}
