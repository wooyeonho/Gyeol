"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useAgentStore } from "@/store/agent-store";
import { useTranslations } from "@/components/i18n-provider";
import { DNA_AXES, type CreatureDNA } from "@/lib/genome/dna";
import { getExpressedTraits } from "@/lib/genome/traits";
import { deriveSpecies } from "@/lib/genome/species";
import { PortraitGallery } from "@/components/portrait-gallery";
import { getDnaAxisLabel } from "@/lib/i18n/dna-axis-labels";
import dynamic from "next/dynamic";

const CreatureStatsCard = dynamic(() => import("@/components/creature-stats-card").then(m => m.CreatureStatsCard), { ssr: false });
const SkillTreeView = dynamic(() => import("@/components/skill-tree-view").then(m => m.SkillTreeView), { ssr: false });
const ItemsInventory = dynamic(() => import("@/components/items-inventory").then(m => m.ItemsInventory), { ssr: false });
const TeamManager = dynamic(() => import("@/components/team-manager").then(m => m.TeamManager), { ssr: false });

const AXIS_GROUPS = [
  { key: "cognitive", labels: { ko: "인지", en: "Cognitive", ja: "認知", zh: "认知", es: "Cognitivo" }, axes: ["analytical", "intuitive", "verbal", "spatial"] as const, color: "#38bdf8" },
  { key: "emotional", labels: { ko: "감정", en: "Emotional", ja: "感情", zh: "情感", es: "Emocional" }, axes: ["warmth", "intensity", "stability", "openness"] as const, color: "#f472b6" },
  { key: "social",    labels: { ko: "사회", en: "Social",    ja: "社会", zh: "社交", es: "Social" },    axes: ["assertiveness", "empathy", "playfulness", "independence"] as const, color: "#34d399" },
  { key: "meta",      labels: { ko: "메타", en: "Meta",      ja: "メタ", zh: "元",   es: "Meta" },      axes: ["curiosity", "persistence", "adaptability", "creativity"] as const, color: "#a78bfa" },
];

type LocKey = "ko" | "en" | "ja" | "zh" | "es";
const normLoc = (l: string): LocKey => ((["ko", "en", "ja", "zh", "es"].includes(l) ? l : "en") as LocKey);

/** SVG radar chart — 16 axes in 4 groups of 4, rendered as concentric spiderweb */
function RadarChart({ dna, size = 280, locale }: { dna: CreatureDNA; size?: number; locale: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const axes = DNA_AXES;
  const n = axes.length;

  const points = axes.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const val = dna[axes[i] as keyof CreatureDNA] ?? 0.5;
    return {
      x: cx + Math.cos(angle) * r * val,
      y: cy + Math.sin(angle) * r * val,
      lx: cx + Math.cos(angle) * (r + 20),
      ly: cy + Math.sin(angle) * (r + 20),
      val,
    };
  });

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Group color for each axis
  const axisColors = axes.map((axis) => {
    for (const g of AXIS_GROUPS) {
      if ((g.axes as unknown as string[]).includes(axis)) return g.color;
    }
    return "#ffffff";
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Grid rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => {
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
            return `${cx + Math.cos(angle) * r * ring},${cy + Math.sin(angle) * r * ring}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * r}
            y2={cy + Math.sin(angle) * r}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <motion.polygon
        points={polyPoints}
        fill="rgba(34,211,238,0.12)"
        stroke="rgba(34,211,238,0.6)"
        strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Data points */}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={axisColors[i]}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.04 }}
        />
      ))}

      {/* Axis labels */}
      {points.map((p, i) => (
        <text
          key={`label-${i}`}
          x={p.lx}
          y={p.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fill={axisColors[i]}
          opacity="0.7"
        >
          {getDnaAxisLabel(axes[i], locale)}
        </text>
      ))}
    </svg>
  );
}

/** Shows recent DNA axis mutations from agent config history */
function MutationHistory({ config, locale }: { config: Record<string, unknown>; locale: string }) {
  const mutationTrait = config.mutation_trait as string | undefined;
  const recentShifts: { axis: string; direction: string; value: number }[] = [];

  if (mutationTrait && mutationTrait.startsWith("dna_shift:")) {
    const parts = mutationTrait.split(":");
    if (parts.length >= 3) {
      const axis = parts[1];
      const val = parseFloat(parts[2]);
      if (axis && !isNaN(val)) {
        recentShifts.push({ axis, direction: val >= 0 ? "up" : "down", value: Math.abs(val) });
      }
    }
  }

  if (recentShifts.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
        Recent Mutations
      </p>
      <div className="space-y-1.5">
        {recentShifts.map((shift, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
          >
            <span className={`text-sm font-bold ${shift.direction === "up" ? "text-emerald-400" : "text-rose-400"}`}>
              {shift.direction === "up" ? "\u2191" : "\u2193"}
            </span>
            <span className="text-xs text-white/60">
              {getDnaAxisLabel(shift.axis, locale)}
            </span>
            <span className={`ml-auto text-xs font-medium ${shift.direction === "up" ? "text-emerald-400/70" : "text-rose-400/70"}`}>
              {shift.direction === "up" ? "+" : "-"}{(shift.value * 100).toFixed(1)}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function DNAPage() {
  const { t, locale } = useTranslations();
  const loc = normLoc(locale);
  const agentState = useAgentStore((s) => s.agentState);
  // genome is stored as JSON with a .dna sub-object at runtime (from Supabase JSONB)
  const dna = (agentState?.genome as unknown as { dna?: CreatureDNA } | null)?.dna;

  const speciesInfo = useMemo(() => {
    if (!dna) return null;
    try { return deriveSpecies(dna); } catch { return null; }
  }, [dna]);

  const traits = useMemo(() => {
    if (!dna) return [];
    try { return getExpressedTraits(dna).slice(0, 6); } catch { return []; }
  }, [dna]);

  const defaultDNA: CreatureDNA = {
    analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
    warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
    assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
    curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
  };
  const activeDNA = dna ?? defaultDNA;

  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-5">

        {/* Header */}
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">DNA Profile</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {agentState?.self_name ?? "GYEOL"}
          </h1>
          {speciesInfo && (
            <p className="mt-1 text-sm text-cyan-300/60">{speciesInfo.name}</p>
          )}
          <div className="mt-1 flex items-center justify-center gap-2 text-xs text-white/50">
            <span>Gen {agentState?.gen_level ?? 1}</span>
            {speciesInfo?.archetype && (
              <>
                <span>·</span>
                <span>{speciesInfo.archetype}</span>
              </>
            )}
            {speciesInfo?.element && (
              <>
                <span>·</span>
                <span>{speciesInfo.element}</span>
              </>
            )}
          </div>
        </header>

        {/* Radar chart */}
        <div className="flex justify-center">
          <RadarChart dna={activeDNA} size={300} locale={locale} />
        </div>

        {/* Group bars */}
        <div className="space-y-4">
          {AXIS_GROUPS.map((group) => (
            <div key={group.key}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: group.color }}>
                {group.labels[loc]}
              </p>
              <div className="space-y-2">
                {group.axes.map((axis) => {
                  const val = activeDNA[axis as keyof CreatureDNA] ?? 0.5;
                  return (
                    <div key={axis} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs text-white/50">
                        {getDnaAxisLabel(axis, locale)}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: group.color }}
                          initial={{ width: "0%" }}
                          animate={{ width: `${val * 100}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs text-white/50">
                        {Math.round(val * 100)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Creature Stats — derived from DNA */}
        {dna && (
          <CreatureStatsCard
            dna={activeDNA}
            genLevel={agentState?.gen_level as number ?? 1}
          />
        )}

        {/* Skill Tree — DNA-based ability progression */}
        {dna && (
          <SkillTreeView
            dna={activeDNA}
            genLevel={agentState?.gen_level as number ?? 1}
          />
        )}

        {/* Items & Equipment */}
        {dna && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              {t("dna.equipment") || "장비 & 아이템"}
            </p>
            <ItemsInventory />
          </div>
        )}

        {/* Team Management */}
        {dna && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              {t("dna.team") || "팀 관리"}
            </p>
            <TeamManager locale={locale} />
          </div>
        )}

        {/* Expressed traits */}
        {traits.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              {t("dna.expressedTraits") || "발현 특성"}
            </p>
            <div className="flex flex-wrap gap-2">
              {traits.map((trait, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/70"
                >
                  {loc === "ko" ? trait.name.ko : trait.name.en}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Mutation history — recent DNA axis changes */}
        {dna && agentState?.config && (
          <MutationHistory config={agentState.config as Record<string, unknown>} locale={locale} />
        )}

        {/* Portrait Gallery — AI-generated creature portraits */}
        {dna && <PortraitGallery />}

        {!dna && (
          <p className="text-center text-sm text-white/40 py-4">
            {t("dna.noData") || "DNA forms as you converse more."}
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
