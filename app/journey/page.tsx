"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { DiscussInChatButton } from "@/components/discover/discuss-in-chat";

interface RadarPoint {
  axis: string;
  value: number;
  label: string;
}

interface TimelineEntry {
  id: string;
  date: string;
  type: string;
  summary: string;
  mood: string | null;
}

interface JourneyData {
  radarData: RadarPoint[];
  timeline: TimelineEntry[];
  dominantMood: string;
  traitHistory: Array<{ summary: string; date: string }>;
  stats: { totalMessages: number; totalMemories: number; totalDreams: number; days: number };
}

function RadarChart({ data }: { data: RadarPoint[] }) {
  const size = 280;
  const center = size / 2;
  const radius = 110;
  const levels = 4;

  const angleStep = (2 * Math.PI) / data.length;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  const dataPoints = data.map((d, i) => getPoint(i, d.value));
  const pathD = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[280px]">
      {/* Grid circles */}
      {Array.from({ length: levels }, (_, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={radius * ((i + 1) / levels)}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />
      ))}
      {/* Axis lines */}
      {data.map((_, i) => {
        const p = getPoint(i, 1);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />;
      })}
      {/* Data polygon */}
      <motion.path
        d={pathD}
        fill="rgba(129, 140, 248, 0.15)"
        stroke="rgba(129, 140, 248, 0.6)"
        strokeWidth={1.5}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="rgb(129, 140, 248)" />
      ))}
      {/* Labels */}
      {data.map((d, i) => {
        const labelPoint = getPoint(i, 1.2);
        return (
          <text
            key={i}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white/40 text-[8px]"
          >
            {d.label.slice(0, 4)}
          </text>
        );
      })}
    </svg>
  );
}

const TYPE_ICONS: Record<string, string> = {
  chat: "💬", dream: "🌙", social: "👥", evolution: "🧬", trait: "✨", diary: "📝",
};

export default function JourneyPage() {
  const { t } = useTranslations();
  const agentState = useAgentStore((s) => s.agentState);
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | undefined;

  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJourney = useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/journey?agentId=${agentId}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchJourney(); }, [fetchJourney]);

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">
            {t("journey.eyebrow") || "Journey"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("journey.title") || "우리의 여정"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("journey.subtitle") || "함께한 기억과 성장의 기록"}
          </p>
          <div className="mt-3 flex justify-center">
            <DiscussInChatButton
              prompt={t("discover.discussThisPrompt")
                .replace("{name}", agentState?.self_name || "GYEOL")
                .replace("{page}", t("journey.title") || "Journey")}
              label={t("discover.discussHere")}
              variant="ghost"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          </div>
        ) : data ? (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("journey.messages") || "메시지", value: data.stats.totalMessages, icon: "💬" },
                { label: t("journey.memories") || "기억", value: data.stats.totalMemories, icon: "🧠" },
                { label: t("journey.dreams") || "꿈", value: data.stats.totalDreams, icon: "🌙" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <span className="text-lg">{s.icon}</span>
                  <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/40">{s.label}</p>
                </div>
              ))}
            </div>

            {/* DNA Radar Chart */}
            {data.radarData.length > 0 && (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <h3 className="mb-4 text-sm font-medium text-white/70 text-center">
                  {t("journey.dnaProfile") || "DNA 프로필"}
                </h3>
                <RadarChart data={data.radarData} />
              </div>
            )}

            {/* Trait history */}
            {data.traitHistory.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/70">
                  {t("journey.traitHistory") || "특성 발현 기록"}
                </h3>
                {data.traitHistory.map((trait, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3"
                  >
                    <span className="text-lg">✨</span>
                    <div className="flex-1">
                      <p className="text-sm text-white/80">{trait.summary}</p>
                      <p className="text-xs text-white/30">{new Date(trait.date).toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">
                {t("journey.timeline") || "활동 타임라인"}
              </h3>
              {data.timeline.length > 0 ? (
                data.timeline.slice(0, 30).map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                  >
                    <span className="mt-0.5 text-base">{TYPE_ICONS[entry.type] ?? "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 line-clamp-2">{entry.summary}</p>
                      <p className="mt-0.5 text-xs text-white/25">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-sm text-white/30 py-8">
                  {t("journey.noEntries") || "아직 기록이 없습니다"}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-white/40 py-16">
            {t("journey.noAgent") || "에이전트를 먼저 생성해주세요"}
          </p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
