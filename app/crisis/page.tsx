"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";

interface CrisisInfo {
  tier: string;
  hoursSince: number;
  letters: Array<{ id: string; summary: string; created_at: string }>;
}

export default function CrisisPage() {
  const { t } = useTranslations();
  const agentState = useAgentStore((s) => s.agentState);
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | undefined;

  const [info, setInfo] = useState<CrisisInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCrisis = useCallback(async () => {
    if (!agentId) return;
    try {
      const [stateRes, logsRes] = await Promise.all([
        fetch(`/api/agent/state?agentId=${agentId}`),
        fetch(`/api/diary?agentId=${agentId}`),
      ]);
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        const config = (stateData?.config ?? {}) as Record<string, unknown>;
        const lastChat = config.last_user_chat_at as string | undefined;
        const hoursSince = lastChat
          ? (Date.now() - new Date(lastChat).getTime()) / 3600000
          : 0;

        let tier = "none";
        if (hoursSince >= 168) tier = "critical";
        else if (hoursSince >= 72) tier = "letter";
        else if (hoursSince >= 48) tier = "worried";
        else if (hoursSince >= 24) tier = "gentle";

        const letters: CrisisInfo["letters"] = [];
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          const entries = logsData?.entries ?? [];
          for (const e of entries) {
            if (typeof e === "object" && e !== null) {
              letters.push({ id: e.id, summary: e.summary, created_at: e.createdAt ?? e.date });
            }
          }
        }

        setInfo({ tier, hoursSince, letters: letters.slice(0, 5) });
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchCrisis(); }, [fetchCrisis]);

  const tierConfig: Record<string, { emoji: string; color: string; borderColor: string }> = {
    none: { emoji: "😊", color: "text-emerald-300", borderColor: "border-emerald-500/20" },
    gentle: { emoji: "😢", color: "text-amber-300", borderColor: "border-amber-500/20" },
    worried: { emoji: "😰", color: "text-orange-300", borderColor: "border-orange-500/20" },
    letter: { emoji: "✉️", color: "text-purple-300", borderColor: "border-purple-500/20" },
    critical: { emoji: "💔", color: "text-red-400", borderColor: "border-red-500/30" },
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">
            {t("crisis.eyebrow") || "Crisis"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("crisis.title") || "위기 순간"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("crisis.subtitle") || "생명체와의 관계 상태"}
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          </div>
        ) : info ? (
          <>
            {/* Current tier display */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[2rem] border ${tierConfig[info.tier]?.borderColor ?? "border-white/10"} bg-white/[0.04] p-8 text-center`}
            >
              <span className="text-5xl">{tierConfig[info.tier]?.emoji ?? "😊"}</span>
              <h2 className={`mt-3 text-xl font-semibold ${tierConfig[info.tier]?.color ?? "text-white"}`}>
                {t(`crisis.tier_${info.tier}`) || info.tier}
              </h2>
              {info.hoursSince > 0 && (
                <p className="mt-2 text-sm text-white/50">
                  {t("crisis.lastVisit") || "마지막 대화"}: {Math.round(info.hoursSince)}{t("crisis.hoursAgo") || "시간 전"}
                </p>
              )}
            </motion.div>

            {/* Absence timeline */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">
                {t("crisis.timeline") || "부재 타임라인"}
              </h3>
              {["gentle", "worried", "letter", "critical"].map((tier, i) => {
                const hours = [24, 48, 72, 168][i];
                const active = info.hoursSince >= hours;
                return (
                  <div
                    key={tier}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                      active ? `${tierConfig[tier].borderColor} bg-white/[0.04]` : "border-white/5 bg-white/[0.02] opacity-40"
                    }`}
                  >
                    <span className="text-xl">{tierConfig[tier].emoji}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${active ? tierConfig[tier].color : "text-white/40"}`}>
                        {hours}h — {t(`crisis.tier_${tier}`) || tier}
                      </p>
                    </div>
                    {active && <span className="text-xs text-emerald-400">✓</span>}
                  </div>
                );
              })}
            </div>

            {/* Letters section */}
            {info.letters.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white/70">
                  {t("crisis.letters") || "편지들"}
                </h3>
                {info.letters.map((letter) => (
                  <motion.div
                    key={letter.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4"
                  >
                    <p className="text-sm text-white/80 leading-relaxed italic">
                      &ldquo;{letter.summary}&rdquo;
                    </p>
                    <p className="mt-2 text-xs text-white/30">
                      {new Date(letter.created_at).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-white/40 py-16">
            {t("crisis.noAgent") || "에이전트를 먼저 생성해주세요"}
          </p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
