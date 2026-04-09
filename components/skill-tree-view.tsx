"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  getUnlockedSkills,
  getNearUnlockSkills,
  getSkillsByBranch,
  type Skill,
} from "@/lib/creature/skill-tree";
import type { CreatureDNA } from "@/lib/genome/dna";

interface SkillTreeViewProps {
  dna: CreatureDNA;
  genLevel: number;
  locale?: string;
}

/**
 * Visual skill tree display — shows unlocked, near-unlock, and locked skills.
 * Organized by DNA branch with tier progression.
 */
export function SkillTreeView({ dna, genLevel, locale = "en" }: SkillTreeViewProps) {
  const isKo = locale?.startsWith("ko");
  const unlocked = useMemo(() => new Set(getUnlockedSkills(dna, genLevel).map((s) => s.id)), [dna, genLevel]);
  const nearUnlock = useMemo(() => new Set(getNearUnlockSkills(dna, genLevel).map((s) => s.id)), [dna, genLevel]);
  const branches = useMemo(() => getSkillsByBranch(), []);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-white/80">
          {isKo ? "스킬 트리" : "Skill Tree"}
        </h3>
        <span className="text-xs text-white/40">
          {unlocked.size}/{branches.size * 3} {isKo ? "해금됨" : "unlocked"}
        </span>
      </div>

      {Array.from(branches.entries()).map(([branch, skills]) => (
        <div key={branch} className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-white/30">
            {branch}
          </p>
          <div className="flex gap-2">
            {skills
              .sort((a, b) => a.tier - b.tier)
              .map((skill) => (
                <SkillNode
                  key={skill.id}
                  skill={skill}
                  isUnlocked={unlocked.has(skill.id)}
                  isNear={nearUnlock.has(skill.id)}
                  isKo={isKo}
                  dnaValue={dna[skill.branch]}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillNode({
  skill,
  isUnlocked,
  isNear,
  isKo,
  dnaValue,
}: {
  skill: Skill;
  isUnlocked: boolean;
  isNear: boolean;
  isKo: boolean;
  dnaValue: number;
}) {
  const tierColors = {
    1: "border-white/15",
    2: "border-blue-400/30",
    3: "border-purple-400/40",
  };

  return (
    <motion.div
      className={`relative flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
        isUnlocked
          ? `${tierColors[skill.tier]} bg-white/8`
          : isNear
            ? "border-yellow-400/25 bg-yellow-400/5"
            : "border-white/5 bg-white/[0.02] opacity-40"
      }`}
      style={{ minWidth: 80 }}
      whileHover={{ scale: 1.05 }}
      title={
        isUnlocked
          ? (isKo ? skill.description.ko : skill.description.en)
          : `${(skill.threshold * 100).toFixed(0)}% ${skill.branch} required (current: ${(dnaValue * 100).toFixed(0)}%)`
      }
    >
      <span className="text-xl">{skill.icon}</span>
      <span className="mt-1 text-[10px] font-medium text-white/70 leading-tight">
        {isKo ? skill.name.ko : skill.name.en}
      </span>
      {isUnlocked && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 ring-2 ring-black" />
      )}
      {isNear && !isUnlocked && (
        <span className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-yellow-400 ring-2 ring-black" />
      )}
      {!isUnlocked && (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/20"
            style={{ width: `${Math.min((dnaValue / skill.threshold) * 100, 100)}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
