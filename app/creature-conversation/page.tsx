"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { haptic } from "@/lib/micro-interactions";
import { getDnaAxisLabel } from "@/lib/i18n/dna-axis-labels";

interface ConversationTurn {
  speakerId: string;
  speakerName: string;
  speaker?: "A" | "B";
  text: string;
  timestamp?: string;
}

interface ConversationResult {
  turns: ConversationTurn[];
  dnaEffectsA: Array<{ axis: string; delta: number }>;
  dnaEffectsB: Array<{ axis: string; delta: number }>;
}

interface OtherCreature {
  agent_id: string;
  name: string;
  species: string;
  gen_level: number;
}

export default function CreatureConversationPage() {
  const { t, locale } = useTranslations();
  const agentState = useAgentStore((s) => s.agentState);
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | undefined;
  const coins = ((agentState as Record<string, unknown> | null)?.coins as number) ?? 0;

  const [others, setOthers] = useState<OtherCreature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ConversationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversing, setConversing] = useState(false);
  const [error, setError] = useState("");

  const COST = 10;

  const fetchOthers = useCallback(async () => {
    try {
      const res = await fetch("/api/explore");
      if (res.ok) {
        const data = await res.json();
        const agents = (data.agents ?? []) as Array<Record<string, unknown>>;
        setOthers(
          agents
            .filter((a) => a.agent_id !== agentId)
            .slice(0, 20)
            .map((a) => ({
              agent_id: a.agent_id as string,
              name: (a.name as string) || "Unnamed",
              species: (a.species as string) || "Unknown",
              gen_level: (a.gen_level as number) || 1,
            }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchOthers(); }, [fetchOthers]);

  const startConversation = async () => {
    if (!agentId || !selectedId) return;
    if (coins < COST) {
      setError(t("creatureConversation.notEnoughCoins") || "코인이 부족합니다");
      return;
    }

    setConversing(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/creature-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIdA: agentId, agentIdB: selectedId }),
      });

      if (res.ok) {
        const data = await res.json();
        haptic("success");
        const toEffectArray = (obj: Record<string, number> | undefined) =>
          Object.entries(obj ?? {}).map(([axis, delta]) => ({ axis, delta: delta as number }));
        setResult({
          turns: (data.turns ?? []).map((t: Record<string, unknown>, i: number) => ({
            speakerId: (t.speakerId as string) ?? "",
            speakerName: (t.speakerName as string) ?? "",
            speaker: (i % 2 === 0 ? "A" : "B") as "A" | "B",
            text: (t.text as string) ?? "",
          })),
          dnaEffectsA: toEffectArray(data.dnaEffectsA),
          dnaEffectsB: toEffectArray(data.dnaEffectsB),
        });
        // Refresh agent store for updated coins
        useAgentStore.getState().fetchAgentState();
      } else {
        const data = await res.json();
        setError(data.error || "대화에 실패했습니다");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setConversing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">
            {t("creatureConversation.eyebrow") || "Creature Talk"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("creatureConversation.title") || "크리처 대화"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("creatureConversation.subtitle") || "다른 생명체를 초대해서 대화를 나눠보세요"}
          </p>
        </header>

        {/* Cost info */}
        <div className="flex items-center justify-between glass-card rounded-2xl p-4">
          <div>
            <p className="text-xs text-white/40">{t("creatureConversation.cost") || "대화 비용"}</p>
            <p className="text-lg font-bold text-amber-300">🪙 {COST}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">{t("creatureConversation.balance") || "보유 코인"}</p>
            <p className="text-lg font-bold text-white">{coins}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          </div>
        ) : !result ? (
          <>
            {/* Creature selection */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">
                {t("creatureConversation.selectCreature") || "대화할 생명체를 선택하세요"}
              </h3>
              {others.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {others.map((creature) => (
                    <button
                      key={creature.agent_id}
                      type="button"
                      onClick={() => {
                        haptic("tap");
                        setSelectedId(creature.agent_id);
                      }}
                      className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                        selectedId === creature.agent_id
                          ? "border-indigo-400/50 bg-indigo-500/15"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30">
                        <span className="text-lg">🧬</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{creature.name}</p>
                        <p className="text-xs text-white/40">
                          {creature.species} · Gen {creature.gen_level}
                        </p>
                      </div>
                      {selectedId === creature.agent_id && (
                        <span className="text-indigo-300 text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-white/30 py-8">
                  {t("creatureConversation.noCreatures") || "아직 다른 생명체가 없습니다"}
                </p>
              )}
            </div>

            {/* Error */}
            {error && <p className="text-center text-sm text-red-400">{error}</p>}

            {/* Start button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={startConversation}
              disabled={!selectedId || conversing || coins < COST}
              className="w-full rounded-full bg-indigo-500 py-3.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-30 transition-all"
            >
              {conversing
                ? (t("creatureConversation.conversing") || "대화 중...")
                : (t("creatureConversation.start") || `대화 시작 (🪙 ${COST})`)}
            </motion.button>
          </>
        ) : (
          /* Conversation result */
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-medium text-white/70">
                {t("creatureConversation.transcript") || "대화 기록"}
              </h3>

              {/* Conversation turns */}
              <div className="space-y-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                {result.turns.map((turn, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className={`flex ${turn.speaker === "A" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 ${
                        turn.speaker === "A"
                          ? "rounded-bl-sm bg-indigo-500/15 border border-indigo-500/20"
                          : "rounded-br-sm bg-purple-500/15 border border-purple-500/20"
                      }`}
                    >
                      <p className="text-xs text-white/40 mb-1">
                        {turn.speaker === "A" ? "🟣 " : "🔵 "}
                        {t(`creatureConversation.speaker${turn.speaker}`) || `생명체 ${turn.speaker}`}
                      </p>
                      <p className="text-sm text-white/80 leading-relaxed">{turn.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* DNA effects */}
              {(result.dnaEffectsA.length > 0 || result.dnaEffectsB.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("creatureConversation.myCreature") || "내 생명체", effects: result.dnaEffectsA },
                    { label: t("creatureConversation.otherCreature") || "상대 생명체", effects: result.dnaEffectsB },
                  ].map((side) => (
                    <div key={side.label} className="glass-card rounded-2xl p-3">
                      <p className="text-xs text-white/50 mb-2">{side.label}</p>
                      {side.effects.length > 0 ? (
                        <div className="space-y-1">
                          {side.effects.map((e) => (
                            <div key={e.axis} className="flex items-center justify-between text-xs">
                              <span className="text-white/60">{getDnaAxisLabel(e.axis, locale)}</span>
                              <span className={e.delta > 0 ? "text-emerald-300" : "text-red-300"}>
                                {e.delta > 0 ? "+" : ""}{(e.delta * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/20">{t("creatureConversation.noEffect") || "변화 없음"}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* New conversation button */}
              <button
                type="button"
                onClick={() => { setResult(null); setSelectedId(null); setError(""); }}
                className="w-full rounded-full border border-white/10 py-3 text-sm text-white/60 hover:bg-white/5 transition-colors"
              >
                {t("creatureConversation.again") || "다른 생명체와 대화하기"}
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
