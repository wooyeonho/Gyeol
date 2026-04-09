"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { haptic } from "@/lib/micro-interactions";
import type { CareState } from "@/lib/creature/care-loop";
import { CareHeatmap, logCareActivity } from "@/components/care-heatmap";

function GaugeBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const isLow = pct < 20;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-white/70">
          <span className="text-lg">{icon}</span> {label}
        </span>
        <span className={`text-sm font-semibold ${isLow ? "text-red-400" : "text-white/60"}`}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full ${color}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function CarePage() {
  const { t } = useTranslations();
  const agentState = useAgentStore((s) => s.agentState);
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | undefined;
  const coins = ((agentState as Record<string, unknown> | null)?.coins as number) ?? 0;

  const [care, setCare] = useState<CareState | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchCare = useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/care?agentId=${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setCare(data.careState);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchCare(); }, [fetchCare]);

  const doAction = async (action: "feed" | "rest" | "play") => {
    if (!agentId || acting) return;
    setActing(true);
    haptic("tap");
    try {
      const res = await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setCare(data.careState);
        haptic("success");
        logCareActivity();
        useAgentStore.getState().fetchAgentState();
      }
    } finally {
      setActing(false);
    }
  };

  const isSick = care ? (care.hunger <= 0 || care.energy <= 0 || care.happiness <= 0) : false;

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">
            {t("care.eyebrow") || "Care"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("care.title") || "돌봄"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("care.subtitle") || "생명체의 상태를 돌봐주세요"}
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          </div>
        ) : care ? (
          <>
            {isSick && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center"
              >
                <span className="text-2xl">🤒</span>
                <p className="mt-1 text-sm font-medium text-red-300">
                  {t("care.sickWarning") || "생명체가 아파요! 빨리 돌봐주세요."}
                </p>
              </motion.div>
            )}

            <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <GaugeBar
                label={t("care.hunger") || "배고픔"}
                value={care.hunger}
                color="bg-gradient-to-r from-orange-500 to-amber-400"
                icon="🍽"
              />
              <GaugeBar
                label={t("care.energy") || "에너지"}
                value={care.energy}
                color="bg-gradient-to-r from-blue-500 to-cyan-400"
                icon="⚡"
              />
              <GaugeBar
                label={t("care.happiness") || "기분"}
                value={care.happiness}
                color="bg-gradient-to-r from-pink-500 to-rose-400"
                icon="💖"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled={acting || coins < 5}
                onClick={() => doAction("feed")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/8 p-4 transition-all hover:bg-orange-500/15 disabled:opacity-40"
              >
                <span className="text-3xl">🍖</span>
                <span className="text-sm font-medium text-white">{t("care.feed") || "먹이주기"}</span>
                <span className="text-xs text-white/50">🪙 5</span>
              </button>
              <button
                type="button"
                disabled={acting || coins < 3}
                onClick={() => doAction("rest")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4 transition-all hover:bg-blue-500/15 disabled:opacity-40"
              >
                <span className="text-3xl">🛏</span>
                <span className="text-sm font-medium text-white">{t("care.rest") || "재우기"}</span>
                <span className="text-xs text-white/50">🪙 3</span>
              </button>
              <button
                type="button"
                disabled={acting || coins < 4}
                onClick={() => doAction("play")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-pink-500/20 bg-pink-500/8 p-4 transition-all hover:bg-pink-500/15 disabled:opacity-40"
              >
                <span className="text-3xl">🎮</span>
                <span className="text-sm font-medium text-white">{t("care.play") || "놀아주기"}</span>
                <span className="text-xs text-white/50">🪙 4</span>
              </button>
            </div>

            <p className="text-center text-xs text-white/40">
              {t("care.touchHint") || "홈에서 생명체를 쓰다듬으면 기분이 올라가요"}
            </p>

            {/* Care activity heatmap */}
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                {t("care.activityLog") || "돌봄 기록"}
              </p>
              <CareHeatmap />
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-white/50 py-16">
            {t("care.noAgent") || "에이전트를 먼저 생성해주세요"}
          </p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
