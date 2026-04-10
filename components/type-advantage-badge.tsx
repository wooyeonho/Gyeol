"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getDominantType, getTypeLabel, type DominantType } from "@/lib/game/type-advantage";
import type { CreatureDNA } from "@/lib/genome/dna";

interface TypeAdvantageBadgeProps {
  dna: CreatureDNA | null;
  locale?: string;
  compact?: boolean;
}

/**
 * Pokemon-style type badge derived from creature DNA.
 * Shows the dominant type with icon, label, and colored background.
 */
export function TypeAdvantageBadge({ dna, locale = "ko", compact = false }: TypeAdvantageBadgeProps) {
  const typeInfo = useMemo(() => {
    if (!dna) return null;
    const dominant = getDominantType(dna);
    return getTypeLabel(dominant);
  }, [dna]);

  if (!typeInfo) return null;

  const label = locale === "ko" ? typeInfo.ko : typeInfo.en;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          background: `${typeInfo.color}18`,
          color: typeInfo.color,
          border: `1px solid ${typeInfo.color}30`,
        }}
      >
        <span>{typeInfo.icon}</span>
        <span>{label}</span>
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 rounded-2xl px-3 py-1.5"
      style={{
        background: `${typeInfo.color}14`,
        border: `1px solid ${typeInfo.color}25`,
      }}
    >
      <span className="text-lg">{typeInfo.icon}</span>
      <div>
        <p className="text-xs font-semibold" style={{ color: typeInfo.color }}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Type advantage wheel — shows the 4-type cycle with arrows.
 */
export function TypeAdvantageWheel({ highlightType }: { highlightType?: DominantType | null }) {
  const types: DominantType[] = ["analytical", "creative", "social", "emotional"];

  return (
    <div className="relative flex items-center justify-center gap-1">
      {types.map((type, i) => {
        const info = getTypeLabel(type);
        const isHighlighted = highlightType === type;
        return (
          <div key={type} className="flex items-center gap-1">
            <motion.span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-medium transition-all"
              style={{
                background: isHighlighted ? `${info.color}30` : `${info.color}10`,
                color: info.color,
                border: `1px solid ${isHighlighted ? info.color : `${info.color}20`}`,
                boxShadow: isHighlighted ? `0 0 8px ${info.color}40` : "none",
              }}
              animate={isHighlighted ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {info.icon} {info.ko}
            </motion.span>
            {i < types.length - 1 && (
              <span className="text-[10px] text-white/30">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
