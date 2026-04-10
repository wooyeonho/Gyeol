"use client";

import { motion } from "framer-motion";

interface StatDelta {
  name: string;
  icon: string;
  current: number;
  proposed: number;
  color: string;
}

interface ItemCompareCardProps {
  currentName: string;
  candidateName: string;
  currentRarity: string;
  candidateRarity: string;
  deltas: StatDelta[];
  onEquip?: () => void;
  onCancel?: () => void;
}

const RARITY_COLOR: Record<string, string> = {
  common: "#94a3b8",
  uncommon: "#4ade80",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

/**
 * Diablo-style item comparison overlay.
 * Shows current vs candidate item with stat deltas.
 */
export function ItemCompareCard({
  currentName,
  candidateName,
  currentRarity,
  candidateRarity,
  deltas,
  onEquip,
  onCancel,
}: ItemCompareCardProps) {
  const currentColor = RARITY_COLOR[currentRarity] ?? "#94a3b8";
  const candidateColor = RARITY_COLOR[candidateRarity] ?? "#94a3b8";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl p-4 shadow-2xl"
    >
      {/* Header — two item names side by side */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider text-white/40">현재 장비</p>
          <p className="text-sm font-semibold" style={{ color: currentColor }}>
            {currentName || "없음"}
          </p>
        </div>
        <span className="text-white/20 text-lg">→</span>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/40">새 장비</p>
          <p className="text-sm font-semibold" style={{ color: candidateColor }}>
            {candidateName}
          </p>
        </div>
      </div>

      {/* Stat deltas */}
      <div className="space-y-2">
        {deltas.map((d) => {
          const diff = d.proposed - d.current;
          const isPositive = diff > 0;
          const isNegative = diff < 0;

          return (
            <div key={d.name} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-white/60">
                <span>{d.icon}</span> {d.name}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 tabular-nums">{d.current}</span>
                <span className="text-white/20">→</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: d.color }}>
                  {d.proposed}
                </span>
                {diff !== 0 && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-[10px] font-bold tabular-nums ${
                      isPositive ? "text-green-400" : isNegative ? "text-red-400" : "text-white/30"
                    }`}
                  >
                    {isPositive ? "+" : ""}{diff}
                  </motion.span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {(onEquip || onCancel) && (
        <div className="flex gap-2 mt-4">
          {onEquip && (
            <button
              type="button"
              onClick={onEquip}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-black transition-all active:scale-95"
              style={{ background: candidateColor }}
            >
              장착하기
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10 active:scale-95"
            >
              취소
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
