"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { DnaRadarChart } from "@/components/dna/radar-chart";
import { CareHeatmap } from "@/components/dna/care-heatmap";

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

  const handleSlider = (axis: string, value: number) => {
    if (!editedDna) return;
    setEditedDna({ ...editedDna, [axis]: value });
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
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60">
              <div className="relative h-48 w-full">
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
                    size={28}
                    glow={50}
                    vitality={1}
                    enableThree={true}
                    contained
                    dna={editedDna}
                    genLevel={1}
                    restoring3dLabel=""
                  />
                </ThreeErrorBoundary>
              </div>
              {/* Species + verbal mode indicator */}
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{isKo ? "종" : "Species"}</span>
                  <span className="text-xs font-medium text-white/80">
                    {previewSpecies?.name ?? "—"}
                  </span>
                </div>
                {verbalLabel && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/40">💬</span>
                    <span className={`text-xs font-mono ${verbalLabel.color}`}>
                      {verbalLabel.mode}
                    </span>
                    <span className="text-[10px] text-white/30">{verbalLabel.desc}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ===== DNA Radar Chart — 16-axis visual ===== */}
            <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="mb-2 text-sm font-medium text-white/70">
                {t("dnaEditor.radarTitle") || "DNA Radar"}
              </h3>
              <DnaRadarChart
                dna={editedDna}
                previousDna={currentDna}
                accentColor="#818cf8"
                size={220}
              />
            </div>

            {/* ===== Care Heatmap — GitHub-style activity grid ===== */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <CareHeatmap careDates={[]} accentColor="#22d3ee" />
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
