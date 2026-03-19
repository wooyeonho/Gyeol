"use client";

import { useMemo } from "react";
import { useAgentStore } from "@/store/agent-store";
import { useTranslations } from "@/components/i18n-provider";
import { DNA_AXES, type CreatureDNA, type DNAAxis } from "@/lib/genome/dna";
import { motion } from "framer-motion";

/** DNA axis categories for visual grouping */
const CATEGORIES: Record<string, readonly DNAAxis[]> = {
  cognitive: ["analytical", "intuitive", "verbal", "spatial"],
  emotional: ["warmth", "intensity", "stability", "openness"],
  social: ["assertiveness", "empathy", "playfulness", "independence"],
  meta: ["curiosity", "persistence", "adaptability", "creativity"],
};

const CATEGORY_COLORS: Record<string, string> = {
  cognitive: "#60a5fa",   // blue
  emotional: "#f472b6",   // pink
  social: "#34d399",      // emerald
  meta: "#a78bfa",        // violet
};

/** Trait tier based on axis value (0..1) */
function getTraitTier(value: number): { label: string; tier: number } {
  if (value >= 0.85) return { label: "mastered", tier: 4 };
  if (value >= 0.65) return { label: "expressed", tier: 3 };
  if (value >= 0.4) return { label: "developing", tier: 2 };
  return { label: "latent", tier: 1 };
}

function AxisBar({ axis, value, color }: { axis: string; value: number; color: string }) {
  const { label, tier } = getTraitTier(value);
  const pct = Math.round(value * 100);

  return (
    <div className="flex items-center gap-2 group">
      <span className="w-24 text-xs text-white/60 capitalize truncate">{axis}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, opacity: 0.5 + tier * 0.12 }}
        />
      </div>
      <span className="w-8 text-right text-[10px] text-white/40">{pct}</span>
      <span
        className="text-[9px] uppercase tracking-wider w-16 text-right"
        style={{ color, opacity: 0.5 + tier * 0.15 }}
      >
        {label}
      </span>
    </div>
  );
}

function TranscendenceTraits({ traits }: { traits: string[] }) {
  if (traits.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">
        Transcendence
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {traits.map((trait) => (
          <span
            key={trait}
            className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-400/20 text-[10px] text-violet-300 capitalize"
          >
            {trait.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TraitDashboard() {
  const { t } = useTranslations();
  const agentState = useAgentStore((s) => s.agentState);

  const dna = (agentState?.genome as { dna?: CreatureDNA } | null)?.dna;
  const transcendenceTraits = useMemo(() => {
    const config = agentState?.config;
    return Array.isArray(config?.transcendence_traits) ? (config.transcendence_traits as string[]) : [];
  }, [agentState?.config]);

  const dominantTraits = useMemo(() => {
    if (!dna) return [];
    return [...DNA_AXES]
      .sort((a, b) => (dna[b] ?? 0) - (dna[a] ?? 0))
      .slice(0, 4);
  }, [dna]);

  if (!dna) {
    return (
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 text-center">
        <p className="text-xs text-white/40">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-4 space-y-3"
    >
      {/* Dominant traits summary */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Dominant
        </span>
        <div className="flex gap-1.5">
          {dominantTraits.map((axis) => {
            const cat = Object.entries(CATEGORIES).find(([, axes]) =>
              axes.includes(axis)
            );
            const color = cat ? CATEGORY_COLORS[cat[0]] : "#fff";
            return (
              <span
                key={axis}
                className="px-2 py-0.5 rounded-full text-[10px] capitalize"
                style={{ backgroundColor: `${color}15`, color, borderColor: `${color}30`, borderWidth: 1 }}
              >
                {axis}
              </span>
            );
          })}
        </div>
      </div>

      {/* DNA axes by category */}
      {Object.entries(CATEGORIES).map(([category, axes]) => (
        <div key={category}>
          <h4
            className="text-[10px] uppercase tracking-[0.2em] mb-1.5"
            style={{ color: CATEGORY_COLORS[category] }}
          >
            {category}
          </h4>
          <div className="space-y-1">
            {axes.map((axis) => (
              <AxisBar
                key={axis}
                axis={axis}
                value={dna[axis] ?? 0.5}
                color={CATEGORY_COLORS[category]}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Transcendence traits (Gen 4+) */}
      <TranscendenceTraits traits={transcendenceTraits} />
    </motion.div>
  );
}
