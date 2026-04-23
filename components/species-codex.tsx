"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FocusTrap } from "@/components/focus-trap";
import { DNA_AXES, type CreatureDNA, type DNAAxis } from "@/lib/genome/dna";
import {
  getSpeciesCatalog,
  getCodex,
  getCompletionRate,
  isDiscovered,
  isOwned,
  getCodexEntry,
  type CatalogEntry,
  type CodexEntry,
} from "@/lib/creature/species-codex";
import {
  getCodexCompletion,
  getUndiscoveredHints,
  CODEX_MILESTONES,
  getCodexRarity,
  calculateRarityBoostedReward,
  type CodexRarity,
} from "@/lib/game/codex-system";

/* ================================================================
 *  SpeciesCodex — Pokemon Pokedex-style collection UI
 *
 *  Grid view of all 128 species families.
 *  Discovered species show name + mini DNA radar.
 *  Undiscovered species show "???" silhouette.
 *  Completion percentage at top.
 *  Filter by discovered/undiscovered/owned.
 *  Each card clickable for details modal.
 *  Dark theme matching the app.
 * ================================================================ */

type FilterMode = "all" | "discovered" | "undiscovered" | "owned";

interface SpeciesCodexProps {
  locale?: string;
}

export function SpeciesCodex({ locale = "en" }: SpeciesCodexProps) {
  const isKo = locale?.startsWith("ko") ?? false;
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [codex, setCodex] = useState<CodexEntry[]>([]);
  const [completion, setCompletion] = useState({ discovered: 0, total: 0, percentage: 0 });

  // Load codex from localStorage on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCodex(getCodex());
    setCompletion(getCompletionRate());
  }, []);

  const catalog = useMemo(() => getSpeciesCatalog(), []);

  // ── Codex-system integration: milestones, hints, rarity ──
  const discoveredSpeciesIds = useMemo(() => codex.map((e) => e.speciesId), [codex]);
  const allSpeciesIds = useMemo(() => catalog.map((c) => c.id), [catalog]);

  const codexCompletion = useMemo(
    () => getCodexCompletion(discoveredSpeciesIds, allSpeciesIds.length),
    [discoveredSpeciesIds, allSpeciesIds],
  );

  const reachedMilestones = useMemo(
    () => CODEX_MILESTONES.filter((m) => codexCompletion.percentage >= m.threshold),
    [codexCompletion.percentage],
  );

  const nextMilestone = useMemo(
    () => CODEX_MILESTONES.find((m) => codexCompletion.percentage < m.threshold),
    [codexCompletion.percentage],
  );

  const undiscoveredHints = useMemo(
    () => getUndiscoveredHints(discoveredSpeciesIds, allSpeciesIds),
    [discoveredSpeciesIds, allSpeciesIds],
  );
  const discoveredIds = useMemo(() => new Set(codex.map((e) => e.speciesId)), [codex]);
  const ownedIds = useMemo(
    () => new Set(codex.filter((e) => e.owned).map((e) => e.speciesId)),
    [codex],
  );

  const filteredCatalog = useMemo(() => {
    switch (filter) {
      case "discovered":
        return catalog.filter((c) => discoveredIds.has(c.id));
      case "undiscovered":
        return catalog.filter((c) => !discoveredIds.has(c.id));
      case "owned":
        return catalog.filter((c) => ownedIds.has(c.id));
      default:
        return catalog;
    }
  }, [catalog, filter, discoveredIds, ownedIds]);

  const selectedEntry = useMemo(() => {
    if (!selectedId) return null;
    const catalogItem = catalog.find((c) => c.id === selectedId);
    const codexItem = codex.find((e) => e.speciesId === selectedId);
    return catalogItem ? { catalog: catalogItem, codex: codexItem } : null;
  }, [selectedId, catalog, codex]);

  const handleCardClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const filters: { key: FilterMode; label: string }[] = [
    { key: "all", label: isKo ? "전체" : "All" },
    { key: "discovered", label: isKo ? "발견" : "Discovered" },
    { key: "undiscovered", label: isKo ? "미발견" : "Undiscovered" },
    { key: "owned", label: isKo ? "보유" : "Owned" },
  ];

  return (
    <div className="space-y-4">
      {/* Completion header */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/45">
            {isKo ? "종 도감" : "Species Codex"}
          </h3>
          <span className="text-sm font-bold tabular-nums text-cyan-400">
            {completion.discovered}/{completion.total}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${completion.percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-white/40">
            {isKo
              ? `${completion.percentage}% 완료`
              : `${completion.percentage}% complete`}
          </p>
          <p className="text-[11px] text-white/30">
            {isKo ? "128종" : "128 species"}
          </p>
        </div>

        {/* ── Milestone progress (codex-system.ts) ── */}
        {nextMilestone && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
            <span className="text-sm">🎯</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white/60 truncate">
                {isKo ? nextMilestone.label.ko : nextMilestone.label.en}
              </p>
              <p className="text-[10px] text-white/30">
                {isKo
                  ? `${nextMilestone.threshold}% 달성 시 ${nextMilestone.reward.coins} 코인 + ${nextMilestone.reward.evolutionPoints} EP`
                  : `At ${nextMilestone.threshold}%: ${nextMilestone.reward.coins} coins + ${nextMilestone.reward.evolutionPoints} EP`}
              </p>
            </div>
            <span className="text-[10px] tabular-nums text-cyan-400/60">
              {codexCompletion.percentage}/{nextMilestone.threshold}%
            </span>
          </div>
        )}

        {/* ── Reached milestones ── */}
        {reachedMilestones.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reachedMilestones.map((m) => (
              <span
                key={m.threshold}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300"
              >
                {isKo ? m.label.ko : m.label.en}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Undiscovered species hints (codex-system.ts) ── */}
      {undiscoveredHints.length > 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3 space-y-1.5">
          <p className="text-[11px] uppercase tracking-widest text-white/30">
            {isKo ? "미발견 힌트" : "Discovery Hints"}
          </p>
          {undiscoveredHints.map((hint, i) => (
            <p key={i} className="text-[11px] italic text-white/25">
              {hint}
            </p>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f.key
                ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60"
            }`}
          >
            {f.label}
            {f.key === "discovered" && (
              <span className="ml-1 text-[10px] opacity-60">{discoveredIds.size}</span>
            )}
            {f.key === "owned" && (
              <span className="ml-1 text-[10px] opacity-60">{ownedIds.size}</span>
            )}
          </button>
        ))}
      </div>

      {/* Species grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        <AnimatePresence mode="popLayout">
          {filteredCatalog.map((entry, idx) => {
            const discovered = discoveredIds.has(entry.id);
            const owned = ownedIds.has(entry.id);
            return (
              <SpeciesCard
                key={entry.id}
                entry={entry}
                discovered={discovered}
                owned={owned}
                rarity={discovered ? getCodexRarity(entry.id, {}) : undefined}
                isKo={isKo}
                index={idx}
                isSelected={selectedId === entry.id}
                onClick={() => handleCardClick(entry.id)}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {filteredCatalog.length === 0 && (
        <div className="py-12 text-center text-white/30 text-sm">
          {isKo ? "해당하는 종이 없습니다" : "No species match this filter"}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedEntry && (
          <SpeciesDetailModal
            catalog={selectedEntry.catalog}
            codex={selectedEntry.codex}
            isKo={isKo}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Species Card ─────────────────────────────────────────────── */

const RARITY_COLORS: Record<CodexRarity, string> = {
  common: "text-white/40",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  "ultra-rare": "text-purple-400",
};

const RARITY_LABELS: Record<CodexRarity, { ko: string; en: string }> = {
  common: { ko: "일반", en: "Common" },
  uncommon: { ko: "비범", en: "Uncommon" },
  rare: { ko: "희귀", en: "Rare" },
  "ultra-rare": { ko: "초희귀", en: "Ultra Rare" },
};

function SpeciesCard({
  entry,
  discovered,
  owned,
  rarity,
  isKo,
  index,
  isSelected,
  onClick,
}: {
  entry: CatalogEntry;
  discovered: boolean;
  owned: boolean;
  rarity?: CodexRarity;
  isKo: boolean;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const codexEntry = useMemo(
    () => (discovered ? getCodexEntry(entry.id) : undefined),
    [discovered, entry.id],
  );

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.01, 0.3) }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer ${
        isSelected
          ? "border-cyan-400/40 bg-cyan-400/10 ring-1 ring-cyan-400/20"
          : discovered
            ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20"
            : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      {/* Owned badge */}
      {owned && (
        <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" />
          </svg>
        </div>
      )}

      {/* Species visual */}
      {discovered && codexEntry?.dnaSnapshot ? (
        <MiniDnaRadar dna={codexEntry.dnaSnapshot} size={40} />
      ) : discovered ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10">
          <div className="h-4 w-4 rounded-full bg-cyan-400/40" />
        </div>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
          <span className="text-sm font-bold text-white/15">?</span>
        </div>
      )}

      {/* Species name */}
      <div className="w-full text-center">
        {discovered ? (
          <>
            <p className="text-[10px] font-medium text-white/80 leading-tight truncate">
              {codexEntry?.derivedName ?? entry.representativeName}
            </p>
            <p className="text-[9px] text-white/30 leading-tight truncate mt-0.5">
              {isKo ? entry.displayName.ko : entry.displayName.en}
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-medium text-white/15 leading-tight">???</p>
            <p className="text-[9px] text-white/10 leading-tight mt-0.5">
              {isKo ? "미발견" : "Unknown"}
            </p>
          </>
        )}
        {/* Rarity badge (codex-system.ts) */}
        {discovered && rarity && rarity !== "common" && (
          <p className={`text-[8px] font-bold uppercase tracking-wider mt-0.5 ${RARITY_COLORS[rarity]}`}>
            {isKo ? RARITY_LABELS[rarity].ko : RARITY_LABELS[rarity].en}
          </p>
        )}
      </div>
    </motion.button>
  );
}

/* ─── Mini DNA Radar Chart (SVG) ───────────────────────────────── */

const RADAR_AXES: DNAAxis[] = [
  "analytical", "warmth", "playfulness", "creativity",
  "stability", "curiosity", "empathy", "intensity",
];

function MiniDnaRadar({ dna, size = 40 }: { dna: Partial<CreatureDNA>; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const numAxes = RADAR_AXES.length;

  const points = RADAR_AXES.map((axis, i) => {
    const value = dna[axis] ?? 0.5;
    const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
    const dist = value * r;
    return `${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background rings */}
      <circle cx={cx} cy={cy} r={r * 0.33} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      {/* Axis lines */}
      {RADAR_AXES.map((_, i) => {
        const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={points}
        fill="rgba(6,182,212,0.2)"
        stroke="rgba(6,182,212,0.6)"
        strokeWidth="1"
      />
    </svg>
  );
}

/* ─── Detail Modal ─────────────────────────────────────────────── */

const AXIS_LABELS_KO: Record<string, string> = {
  analytical: "분석력", intuitive: "직관력", verbal: "언어력", spatial: "공간력",
  warmth: "따뜻함", intensity: "강렬함", stability: "안정감", openness: "개방성",
  assertiveness: "주장력", empathy: "공감력", playfulness: "장난기", independence: "독립성",
  curiosity: "호기심", persistence: "끈기", adaptability: "적응력", creativity: "창의력",
};

function SpeciesDetailModal({
  catalog,
  codex,
  isKo,
  onClose,
}: {
  catalog: CatalogEntry;
  codex: CodexEntry | undefined;
  isKo: boolean;
  onClose: () => void;
}) {
  const discovered = !!codex;

  return (
    <FocusTrap active onEscape={onClose}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1219] p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-white/30 hover:text-white/60 transition-colors"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Radar */}
          <div className="flex-shrink-0">
            {discovered && codex?.dnaSnapshot ? (
              <MiniDnaRadar dna={codex.dnaSnapshot} size={72} />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/[0.04]">
                <span className="text-2xl font-bold text-white/10">?</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">
              {discovered
                ? (codex?.derivedName ?? catalog.representativeName)
                : "???"}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              {isKo ? catalog.displayName.ko : catalog.displayName.en}
            </p>
            {discovered && codex && (
              <p className="text-[11px] text-white/30 mt-1">
                {isKo ? "발견일:" : "Discovered:"}{" "}
                {new Date(codex.discoveredAt).toLocaleDateString(
                  isKo ? "ko-KR" : "en-US",
                  { year: "numeric", month: "short", day: "numeric" },
                )}
              </p>
            )}
            {codex?.owned && (
              <span className="mt-1 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                {isKo ? "보유 중" : "Owned"}
              </span>
            )}
          </div>
        </div>

        {/* Dominant traits */}
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-widest text-white/30 mb-2">
            {isKo ? "지배적 특성" : "Dominant Traits"}
          </p>
          <div className="flex gap-2">
            <TraitBadge
              axis={catalog.cogDominant}
              color="#06b6d4"
              label={isKo ? "인지" : "Cognitive"}
              isKo={isKo}
            />
            <TraitBadge
              axis={catalog.emoDominant}
              color="#8b5cf6"
              label={isKo ? "감정" : "Emotional"}
              isKo={isKo}
            />
            <TraitBadge
              axis={catalog.socialDominant}
              color="#f59e0b"
              label={isKo ? "사회" : "Social"}
              isKo={isKo}
            />
          </div>
        </div>

        {/* DNA snapshot */}
        {discovered && codex?.dnaSnapshot && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-widest text-white/30 mb-2">
              {isKo ? "DNA 프로필" : "DNA Profile"}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {DNA_AXES.map((axis) => {
                const value = codex.dnaSnapshot?.[axis];
                if (value === undefined) return null;
                return (
                  <div key={axis} className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-white/40 truncate">
                      {isKo ? (AXIS_LABELS_KO[axis] ?? axis) : axis}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-cyan-400/60"
                        initial={{ width: 0 }}
                        animate={{ width: `${value * 100}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                    <span className="w-6 text-right text-[9px] tabular-nums text-white/30">
                      {Math.round(value * 100)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Variant info */}
        <div className="mt-5 rounded-xl bg-white/[0.03] p-3">
          <p className="text-[11px] text-white/25">
            {isKo
              ? `이 종족 계열에는 ${catalog.variantCount}가지 이름 변형이 있습니다.`
              : `This species family has ${catalog.variantCount} name variants.`}
          </p>
        </div>

        {!discovered && (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-center">
            <p className="text-sm text-white/30">
              {isKo
                ? "이 종은 아직 발견되지 않았습니다. 대화를 통해 DNA를 변화시켜 새로운 종을 발견하세요!"
                : "This species has not been discovered yet. Shift your creature's DNA through conversation to discover new species!"}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
    </FocusTrap>
  );
}

/* ─── Trait Badge ───────────────────────────────────────────────── */

function TraitBadge({
  axis,
  color,
  label,
  isKo,
}: {
  axis: DNAAxis;
  color: string;
  label: string;
  isKo: boolean;
}) {
  return (
    <div
      className="flex-1 rounded-lg p-2 text-center"
      style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}
    >
      <p className="text-[9px] uppercase tracking-wider" style={{ color: `${color}80` }}>
        {label}
      </p>
      <p className="text-xs font-semibold mt-0.5" style={{ color }}>
        {isKo ? (AXIS_LABELS_KO[axis] ?? axis) : capitalize(axis)}
      </p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
