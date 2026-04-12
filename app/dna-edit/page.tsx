"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { haptic } from "@/lib/micro-interactions";
import { DNA_AXES, type CreatureDNA } from "@/lib/genome/dna";
import { getDnaAxisLabel } from "@/lib/i18n/dna-axis-labels";
import { deriveSpecies } from "@/lib/genome/species";
import { deriveDNATheme } from "@/lib/theme/dna-theme";
import { ThreeErrorBoundary } from "@/components/three-error-boundary";

const VoidCanvas = dynamic(() => import("@/components/void-canvas").then((m) => ({ default: m.VoidCanvas })), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-3xl bg-black/40" />,
});

const AXIS_CATEGORIES: Record<string, string[]> = {
  cognitive: ["analytical", "intuitive", "verbal", "spatial"],
  emotional: ["warmth", "intensity", "stability", "openness"],
  social: ["assertiveness", "empathy", "playfulness", "independence"],
  growth: ["curiosity", "persistence", "adaptability", "creativity"],
};

const AXIS_EMOJIS: Record<string, string> = {
  analytical: "🧠", intuitive: "🔮", verbal: "💬", spatial: "📐",
  warmth: "❤️", intensity: "🔥", stability: "⚖️", openness: "🌈",
  assertiveness: "💪", empathy: "🤝", playfulness: "🎮", independence: "🦅",
  curiosity: "🔍", persistence: "🎯", adaptability: "🌊", creativity: "🎨",
};

const CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  cognitive: { ko: "인지", en: "Cognitive" },
  emotional: { ko: "감정", en: "Emotional" },
  social: { ko: "사회", en: "Social" },
  growth: { ko: "성장", en: "Growth" },
};

const COST_PER_POINT = 10;

export default function DnaEditPage() {
  const { t, locale } = useTranslations();
  const agentState = useAgentStore((s) => s.agentState);
  const agentId = (agentState as Record<string, unknown> | null)?.agent_id as string | undefined;
  const coins = ((agentState as Record<string, unknown> | null)?.coins as number) ?? 0;

  const isKo = locale === "ko" || locale?.startsWith("ko-");

  const [currentDna, setCurrentDna] = useState<CreatureDNA | null>(null);
  const [editedDna, setEditedDna] = useState<CreatureDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchDna = useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agent/state`);
      if (res.ok) {
        const data = await res.json();
        const state = (data?.agentState ?? null) as Record<string, unknown> | null;
        const genome = state?.genome as Record<string, unknown> | undefined;
        const dna = genome?.dna as CreatureDNA | undefined;
        if (dna) {
          setCurrentDna(dna);
          setEditedDna({ ...dna });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchDna(); }, [fetchDna]);

  const totalChanges = editedDna && currentDna
    ? DNA_AXES.reduce((sum, axis) => {
        const edited = editedDna as unknown as Record<string, number>;
        const current = currentDna as unknown as Record<string, number>;
        const diff = Math.abs((edited[axis] ?? 0.5) - (current[axis] ?? 0.5));
        return sum + Math.round(diff * 100);
      }, 0)
    : 0;

  const totalCost = totalChanges * COST_PER_POINT;
  const canAfford = coins >= totalCost;

  const lastHapticRef = useRef(0);
  const handleSlider = (axis: string, value: number) => {
    if (!editedDna) return;
    setEditedDna({ ...editedDna, [axis]: value });
    // Light tick every 120ms max during drag — tactile confirmation of live sync
    const now = performance.now();
    if (now - lastHapticRef.current > 120) {
      lastHapticRef.current = now;
      haptic("tap");
    }
  };

  const handleSave = async () => {
    if (!agentId || !editedDna || totalCost === 0) return;
    if (!canAfford) {
      setError(t("dnaEdit.notEnoughCoins") || "코인이 부족합니다");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dna-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, edits: editedDna }),
      });
      if (res.ok) {
        haptic("success");
        setCurrentDna({ ...editedDna });
        // Refresh agent store
        useAgentStore.getState().fetchAgentState();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (currentDna) {
      setEditedDna({ ...currentDna });
      setError("");
    }
  };

  // Derive species and theme from the edited DNA for real-time preview
  const previewSpecies = useMemo(() => {
    if (!editedDna) return null;
    return deriveSpecies(editedDna);
  }, [editedDna]);

  const previewTheme = useMemo(() => {
    if (!editedDna) return null;
    return deriveDNATheme(editedDna);
  }, [editedDna]);

  // Derive verbal mode label for preview
  const verbalLabel = useMemo(() => {
    if (!editedDna) return null;
    const v = editedDna.verbal;
    if (v < 0.15) return { mode: "SILENT", desc: isKo ? "행동으로만 표현" : "Actions only", color: "text-red-400" };
    if (v < 0.35) return { mode: "MINIMAL", desc: isKo ? "단어/소리만" : "Single words", color: "text-orange-400" };
    if (v < 0.55) return { mode: "BRIEF", desc: isKo ? "짧은 문장" : "Short phrases", color: "text-yellow-300" };
    if (v < 0.75) return { mode: "NORMAL", desc: isKo ? "자연스러운 대화" : "Natural speech", color: "text-white/70" };
    return { mode: "ELOQUENT", desc: isKo ? "시적 표현" : "Poetic & rich", color: "text-purple-300" };
  }, [editedDna, isKo]);

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">
            {t("dnaEdit.eyebrow") || "DNA Lab"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("dnaEdit.title") || "DNA 편집기"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("dnaEdit.subtitle") || "16축 슬라이더로 생명체를 직접 조정하세요"}
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          </div>
        ) : editedDna ? (
          <>
            {/* ===== Live DNA Preview ===== */}
            <div className="sticky top-4 z-10 overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur">
              <div className="relative h-72 w-full">
                <ThreeErrorBoundary
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <div className="h-16 w-16 rounded-full border border-white/10 bg-white/[0.04] animate-pulse" />
                    </div>
                  }
                >
                  <VoidCanvas
                    shape="creature"
                    color={previewTheme ? `hsl(${Math.round(previewTheme.accentHue)}, ${Math.round(previewTheme.accentSaturation)}%, 55%)` : "#6366f1"}
                    size={34}
                    glow={60}
                    vitality={1}
                    enableThree={true}
                    contained
                    dna={editedDna}
                    genLevel={1}
                    restoring3dLabel=""
                  />
                </ThreeErrorBoundary>
                {/* Live sync pulse — re-keys on every DNA change */}
                <motion.div
                  key={`${editedDna.analytical}-${editedDna.intuitive}-${editedDna.warmth}-${editedDna.playfulness}-${editedDna.curiosity}-${editedDna.creativity}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/50"
                  initial={{ scale: 0.9, opacity: 0.7 }}
                  animate={{ scale: 1.25, opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
                {/* LIVE pill — confirms the preview is bound to the sliders */}
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2 py-0.5 backdrop-blur-sm">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-indigo-300"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-100">
                    {t("dnaEdit.live") || "LIVE"}
                  </span>
                </div>
              </div>
              {/* Species + verbal mode indicator */}
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{isKo ? "종" : "Species"}</span>
                  <motion.span
                    key={previewSpecies?.name ?? "—"}
                    className="text-xs font-medium text-white/85"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {previewSpecies?.name ?? "—"}
                  </motion.span>
                </div>
                {verbalLabel && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/40">💬</span>
                    <motion.span
                      key={verbalLabel.mode}
                      className={`text-xs font-mono ${verbalLabel.color}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      {verbalLabel.mode}
                    </motion.span>
                    <span className="text-[10px] text-white/30">{verbalLabel.desc}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cost display */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div>
                <p className="text-xs text-white/40">{t("dnaEdit.cost") || "편집 비용"}</p>
                <p className={`text-lg font-bold ${canAfford ? "text-amber-300" : "text-red-400"}`}>
                  🪙 {totalCost}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40">{t("dnaEdit.balance") || "보유 코인"}</p>
                <p className="text-lg font-bold text-white">{coins}</p>
              </div>
            </div>

            {/* DNA Sliders by category */}
            {Object.entries(AXIS_CATEGORIES).map(([category, axes]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-medium text-white/70">
                  {isKo ? CATEGORY_LABELS[category]?.ko : CATEGORY_LABELS[category]?.en}
                </h3>
                <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  {axes.map((axis) => {
                    const currentRec = currentDna as unknown as Record<string, number> | null;
                    const editedRec = editedDna as unknown as Record<string, number>;
                    const current = currentRec?.[axis] ?? 0.5;
                    const edited = editedRec[axis] ?? 0.5;
                    const changed = Math.abs(edited - current) > 0.005;

                    return (
                      <div key={axis} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs text-white/60">
                            <span>{AXIS_EMOJIS[axis]}</span>
                            {getDnaAxisLabel(axis, locale)}
                          </span>
                          <span className={`text-xs font-mono ${changed ? "text-indigo-300" : "text-white/30"}`}>
                            {(edited * 100).toFixed(0)}%
                            {changed && (
                              <span className="ml-1 text-white/20">
                                ({current < edited ? "+" : ""}{((edited - current) * 100).toFixed(0)})
                              </span>
                            )}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={edited}
                          onChange={(e) => handleSlider(axis, parseFloat(e.target.value))}
                          className="w-full accent-indigo-400"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Error message */}
            {error && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={totalCost === 0}
                className="flex-1 rounded-full border border-white/10 py-3 text-sm text-white/60 hover:bg-white/5 disabled:opacity-30 transition-all"
              >
                {t("dnaEdit.reset") || "초기화"}
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={totalCost === 0 || !canAfford || saving}
                className="flex-1 rounded-full bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-30 transition-all"
              >
                {saving
                  ? (t("dnaEdit.saving") || "저장 중...")
                  : (t("dnaEdit.save") || `적용하기 (🪙 ${totalCost})`)}
              </motion.button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-white/40 py-16">
            {t("dnaEdit.noAgent") || "DNA를 편집하려면 먼저 에이전트를 생성해주세요"}
          </p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
