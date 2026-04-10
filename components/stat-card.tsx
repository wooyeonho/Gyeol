"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  calculateStats,
  getTotalPower,
  getStatGrade,
  getStatExtremes,
  STAT_CONFIG,
  type StatKey,
} from "@/lib/game/stat-system";
import { calculateSkillBonuses } from "@/lib/game/skill-tree";
import type { CreatureDNA } from "@/lib/genome/dna";

interface StatCardProps {
  dna: CreatureDNA;
  genLevel?: number;
  vitality?: number;
  locale?: string;
}

export function StatCard({ dna, genLevel = 1, vitality = 1, locale = "ko" }: StatCardProps) {
  const isKo = locale === "ko";

  const stats = useMemo(() => calculateStats(dna, genLevel, vitality), [dna, genLevel, vitality]);
  const skillBonuses = useMemo(() => calculateSkillBonuses(dna), [dna]);
  const totalPower = useMemo(() => getTotalPower(stats), [stats]);
  const { strongest, weakest } = useMemo(() => getStatExtremes(stats), [stats]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/90">
          {isKo ? "전투 스탯" : "Battle Stats"}
        </h3>
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1">
          <span className="text-[10px] text-white/40">{isKo ? "총합" : "Total"}</span>
          <span className="text-xs font-bold text-white/80">{totalPower}</span>
        </div>
      </div>

      {/* Stat bars */}
      <div className="space-y-2">
        {(Object.entries(STAT_CONFIG) as [StatKey, typeof STAT_CONFIG[StatKey]][]).map(([key, config]) => {
          const value = stats[key];
          const bonus = skillBonuses[key] ?? 0;
          const grade = getStatGrade(value);
          const isStrong = key === strongest;
          const isWeak = key === weakest;

          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-5 text-center text-sm">{config.icon}</span>
              <span className="w-10 text-[11px] text-white/60">
                {isKo ? config.label.ko : config.label.en}
              </span>
              <div className="relative flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: config.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
                {bonus > 0 && (
                  <motion.div
                    className="absolute inset-y-0 rounded-full opacity-50"
                    style={{
                      backgroundColor: "#fbbf24",
                      left: `${value}%`,
                      width: `${Math.min(bonus, 100 - value)}%`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(bonus, 100 - value)}%` }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 80 }}
                  />
                )}
              </div>
              <span className="w-7 text-right text-xs font-mono text-white/70">
                {value}
              </span>
              <span
                className="w-4 text-center text-[10px] font-bold"
                style={{ color: grade.color }}
              >
                {grade.grade}
              </span>
              {isStrong && <span className="text-[9px]" title={isKo ? "최강" : "Strongest"}>🔺</span>}
              {isWeak && <span className="text-[9px]" title={isKo ? "최약" : "Weakest"}>🔻</span>}
            </div>
          );
        })}
      </div>

      {/* Skill bonus note */}
      {Object.keys(skillBonuses).length > 0 && (
        <p className="mt-2 text-[9px] text-yellow-400/40 text-center">
          {isKo ? "스킬 보너스가 적용 중입니다" : "Skill bonuses active"}
        </p>
      )}
    </div>
  );
}
