"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LeaguePlacement, LeagueResponse } from "@/app/api/league/current/route";

const TIER_META: Record<string, { label: string; color: string; glow: string; emoji: string }> = {
  bronze: { label: "Bronze", color: "#f97316", glow: "rgba(249,115,22,0.35)", emoji: "🥉" },
  silver: { label: "Silver", color: "#94a3b8", glow: "rgba(148,163,184,0.35)", emoji: "🥈" },
  gold: { label: "Gold", color: "#facc15", glow: "rgba(250,204,21,0.35)", emoji: "🥇" },
  platinum: { label: "Platinum", color: "#22d3ee", glow: "rgba(34,211,238,0.35)", emoji: "💎" },
  diamond: { label: "Diamond", color: "#60a5fa", glow: "rgba(96,165,250,0.35)", emoji: "💠" },
  obsidian: { label: "Obsidian", color: "#a78bfa", glow: "rgba(167,139,250,0.4)", emoji: "🖤" },
};

function LeagueRow({ placement, promotionLine, demotionLine }: {
  placement: LeaguePlacement;
  promotionLine: number;
  demotionLine: number;
}) {
  const inPromotionZone = placement.rank <= promotionLine;
  const inDemotionZone = placement.rank > demotionLine;
  const rowTone = placement.is_self
    ? "border-cyan-300/35 bg-cyan-400/10"
    : inPromotionZone
      ? "border-emerald-300/25 bg-emerald-400/[0.06]"
      : inDemotionZone
        ? "border-red-400/20 bg-red-500/[0.05]"
        : "border-white/10 bg-white/[0.03]";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-4 rounded-2xl border p-3 ${rowTone}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
          placement.rank === 1
            ? "bg-yellow-400/20 text-yellow-200"
            : placement.rank === 2
              ? "bg-gray-300/20 text-gray-200"
              : placement.rank === 3
                ? "bg-orange-400/20 text-orange-200"
                : "bg-white/5 text-white/70"
        }`}
      >
        {placement.rank}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {placement.agent_name ?? "이름 없는 결"}
          {placement.is_self && (
            <span className="ml-2 rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-cyan-200">
              나
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-white/50">
          {inPromotionZone
            ? "✨ 승급 구간"
            : inDemotionZone
              ? "⚠️ 강등 위험"
              : "유지 구간"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-white">{placement.weekly_xp}</p>
        <p className="text-[10px] uppercase tracking-widest text-white/40">XP</p>
      </div>
    </motion.div>
  );
}

export function LeagueBoard() {
  const [data, setData] = useState<LeagueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/league/current", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch"))))
      .then((d: LeagueResponse) => setData(d))
      .catch(() => setError("리그 정보를 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="theme-panel rounded-2xl p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (!data || data.placements.length === 0) {
    return (
      <div className="theme-panel rounded-2xl p-8 text-center">
        <p className="text-sm text-white/60">
          이번 주 리그에 아직 아무도 없어요. 대화 한 마디로 리그가 시작돼요.
        </p>
      </div>
    );
  }

  const meta = TIER_META[data.tier] ?? TIER_META.bronze;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          borderColor: `${meta.color}40`,
          background: `linear-gradient(135deg, ${meta.color}18 0%, transparent 60%)`,
          boxShadow: `0 0 40px ${meta.glow}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/60">
              이번 주 리그
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: meta.color }}>
              {meta.emoji} {meta.label} 리그
            </h2>
            <p className="mt-1 text-xs text-white/50">
              {data.placements.length}명 중 {data.self_rank ?? "—"}위
            </p>
          </div>
          <div className="text-right text-xs text-white/55">
            <p>
              <span className="text-emerald-300">상위 {data.promotion_line}명</span> 승급
            </p>
            <p className="mt-1">
              <span className="text-red-300">하위 {30 - data.demotion_line}명</span> 강등
            </p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-2">
        {data.placements.map((placement) => (
          <LeagueRow
            key={placement.user_id}
            placement={placement}
            promotionLine={data.promotion_line}
            demotionLine={data.demotion_line}
          />
        ))}
      </div>
    </div>
  );
}
