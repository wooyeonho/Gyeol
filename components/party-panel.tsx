"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PartyMember, SynergyBonus } from "@/lib/game/party-system";
import { PARTY_MAX_SIZE, getPartyPower } from "@/lib/game/party-system";
import { haptic } from "@/lib/micro-interactions";

/* ── Type color mapping (matches type-advantage getTypeLabel) ── */
const TYPE_COLORS: Record<string, string> = {
  analytical: "#38bdf8",
  emotional: "#f472b6",
  social: "#34d399",
  creative: "#a78bfa",
  balanced: "#fbbf24",
};

const TYPE_LABELS_KO: Record<string, string> = {
  analytical: "분석형",
  emotional: "감정형",
  social: "사교형",
  creative: "창조형",
  balanced: "균형형",
};

/* ── Props ── */
export interface PartyPanelProps {
  party: PartyMember[];
  synergies: SynergyBonus[];
  onSwitchActive?: (creatureId: string) => void;
  onAddCreature?: () => void;
  compact?: boolean;
}

/* ── Animation variants ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const slotVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: { duration: 0.2 },
  },
};

const synergyVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

/* ── Stat summary helper ── */
const STAT_ICONS: Record<string, string> = {
  hp: "❤️",
  atk: "⚔️",
  def: "🛡️",
  spd: "💨",
  wis: "📖",
  cha: "✨",
};

function StatSummary({ stats, compact }: { stats: PartyMember["stats"]; compact?: boolean }) {
  const total = stats.hp + stats.atk + stats.def + stats.spd + stats.wis + stats.cha;

  if (compact) {
    return (
      <span className="text-[10px] tabular-nums text-white/40">{total}</span>
    );
  }

  const top3 = (Object.entries(stats) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {top3.map(([key, val]) => (
        <span
          key={key}
          className="flex items-center gap-0.5 text-[10px] tabular-nums text-white/50"
          title={key.toUpperCase()}
        >
          <span className="text-[8px]">{STAT_ICONS[key]}</span>
          {val}
        </span>
      ))}
    </div>
  );
}

/* ── Member slot ── */
function MemberSlot({
  member,
  onTap,
  compact,
}: {
  member: PartyMember;
  onTap?: () => void;
  compact?: boolean;
}) {
  const typeColor = TYPE_COLORS[member.dominantType] ?? "#888";
  const typeLabel = TYPE_LABELS_KO[member.dominantType] ?? member.dominantType;

  return (
    <motion.button
      variants={slotVariants}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        haptic("tap");
        onTap?.();
      }}
      className={`
        relative flex flex-col items-start rounded-2xl border p-3 text-left
        transition-colors duration-200 w-full min-w-0
        ${member.isActive
          ? "border-white/30 bg-white/[0.08] shadow-[0_0_16px_rgba(255,255,255,0.08)]"
          : "border-white/10 bg-black/60 backdrop-blur-xl hover:bg-white/[0.06]"
        }
      `}
      aria-label={`${member.name} ${member.isActive ? "(활성)" : ""}`}
    >
      {/* Active glow ring */}
      {member.isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `0 0 20px ${typeColor}25, inset 0 0 12px ${typeColor}10`,
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Header row: name + level */}
      <div className="flex items-center gap-2 w-full min-w-0">
        {/* Type dot */}
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: typeColor }}
          title={typeLabel}
        />
        <span className="truncate text-sm font-semibold text-white/90">
          {member.name}
        </span>
        <span className="ml-auto shrink-0 text-[10px] font-medium text-white/40">
          Lv.{member.level}
        </span>
      </div>

      {/* Type label */}
      <span
        className="mt-1 inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium"
        style={{
          background: `${typeColor}18`,
          color: typeColor,
          border: `1px solid ${typeColor}30`,
        }}
      >
        {typeLabel}
      </span>

      {/* Stats */}
      <StatSummary stats={member.stats} compact={compact} />

      {/* Active indicator label */}
      {member.isActive && (
        <span className="mt-1.5 text-[10px] font-medium text-cyan-300/70">
          활성 크리처
        </span>
      )}
    </motion.button>
  );
}

/* ── Empty slot ── */
function EmptySlot({ onAdd, compact }: { onAdd?: () => void; compact?: boolean }) {
  return (
    <motion.button
      variants={slotVariants}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        haptic("tap");
        onAdd?.();
      }}
      className={`
        flex flex-col items-center justify-center rounded-2xl
        border border-dashed border-white/15 bg-white/[0.02]
        transition-colors hover:border-white/25 hover:bg-white/[0.04]
        ${compact ? "min-h-[60px]" : "min-h-[100px]"}
        w-full
      `}
      aria-label="크리처 추가"
    >
      <span className="text-2xl text-white/20">+</span>
      {!compact && (
        <span className="mt-1 text-[10px] text-white/25">크리처 추가</span>
      )}
    </motion.button>
  );
}

/* ── Main component ── */
export function PartyPanel({
  party,
  synergies,
  onSwitchActive,
  onAddCreature,
  compact = false,
}: PartyPanelProps) {
  const totalPower = useMemo(() => getPartyPower(party), [party]);
  const emptySlots = PARTY_MAX_SIZE - party.length;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">
          파티
          <span className="ml-1.5 text-xs font-normal text-white/40">
            {party.length}/{PARTY_MAX_SIZE}
          </span>
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] uppercase tracking-widest text-white/30">
            전투력
          </span>
          <span className="text-sm font-bold tabular-nums text-white/70">
            {totalPower.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 2x3 grid */}
      <motion.div
        className="grid grid-cols-3 gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {party.map((member) => (
            <MemberSlot
              key={member.creatureId}
              member={member}
              compact={compact}
              onTap={() => onSwitchActive?.(member.creatureId)}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <EmptySlot
              key={`empty-${i}`}
              onAdd={onAddCreature}
              compact={compact}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Synergy bonuses */}
      {synergies.length > 0 && (
        <motion.div
          className="space-y-1.5 border-t border-white/[0.06] pt-3"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <span className="text-[10px] uppercase tracking-widest text-white/30">
            시너지 보너스
          </span>
          {synergies.map((synergy, idx) => (
            <motion.div
              key={`${synergy.name.ko}-${idx}`}
              variants={synergyVariants}
              className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2"
            >
              <div className="min-w-0">
                <span className="text-xs font-medium text-white/70">
                  {synergy.name.ko}
                </span>
                <p className="text-[10px] text-white/40 truncate">
                  {synergy.description.ko}
                </p>
              </div>
              <span className="shrink-0 ml-2 text-xs font-bold tabular-nums text-emerald-400/80">
                +{synergy.bonusPercent}%
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
