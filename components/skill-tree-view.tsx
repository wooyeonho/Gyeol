"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSkillsByBranch,
  isSkillUnlocked,
  getSkillTreeProgress,
  getNextSkill,
  getBranchInfo,
  getTierThreshold,
  type SkillBranch,
  type Skill,
} from "@/lib/game/skill-tree";
import type { CreatureDNA } from "@/lib/genome/dna";
import { haptic } from "@/lib/micro-interactions";

interface SkillTreeViewProps {
  dna: CreatureDNA;
  genLevel?: number;
  locale?: string;
}

export function SkillTreeView({ dna, locale = "ko" }: SkillTreeViewProps) {
  const isKo = locale === "ko" || locale?.startsWith("ko");
  const [selectedBranch, setSelectedBranch] = useState<SkillBranch>("cognitive");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const progress = useMemo(() => getSkillTreeProgress(dna), [dna]);
  const branchSkills = useMemo(() => getSkillsByBranch(selectedBranch), [selectedBranch]);
  const nextSkill = useMemo(() => getNextSkill(dna, selectedBranch), [dna, selectedBranch]);

  const branches: SkillBranch[] = ["cognitive", "emotional", "social", "meta"];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-white/90 mb-3">
        {isKo ? "스킬 트리" : "Skill Tree"}
      </h3>

      {/* Branch tabs */}
      <div className="flex gap-1 mb-4">
        {branches.map((branch) => {
          const info = getBranchInfo(branch);
          const p = progress[branch];
          const isActive = branch === selectedBranch;

          return (
            <button
              key={branch}
              type="button"
              onClick={() => {
                haptic("tap");
                setSelectedBranch(branch);
                setSelectedSkill(null);
              }}
              className={`flex-1 rounded-xl px-2 py-2 text-center transition-all ${
                isActive
                  ? "bg-white/10 border border-white/20"
                  : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-lg">{info.icon}</span>
              <p className="text-[10px] text-white/50 mt-0.5">
                {isKo ? info.label.ko : info.label.en}
              </p>
              <p className="text-[9px] text-white/30">
                {p.unlocked}/{p.total}
              </p>
            </button>
          );
        })}
      </div>

      {/* Skill nodes */}
      <div className="space-y-1.5">
        {branchSkills.map((skill, idx) => {
          const unlocked = isSkillUnlocked(skill, dna);
          const isNext = nextSkill?.skill.id === skill.id;

          return (
            <motion.button
              key={skill.id}
              type="button"
              onClick={() => {
                haptic("tap");
                setSelectedSkill(selectedSkill?.id === skill.id ? null : skill);
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                unlocked
                  ? "bg-white/[0.06] hover:bg-white/[0.10]"
                  : isNext
                    ? "bg-white/[0.03] border border-dashed border-white/15"
                    : "bg-white/[0.02] opacity-40"
              }`}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl">{unlocked ? skill.icon : "🔒"}</span>
                <span className="text-[8px] text-white/30">T{skill.tier}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${unlocked ? "text-white/80" : "text-white/40"}`}>
                  {isKo ? skill.name.ko : skill.name.en}
                </p>
                <p className="text-[10px] text-white/30 truncate">
                  {isKo ? skill.description.ko : skill.description.en}
                </p>
              </div>
              {unlocked ? (
                <span className="text-[10px] text-green-400/70">✓</span>
              ) : isNext ? (
                <span className="text-[10px] text-yellow-400/70">{nextSkill!.progress}%</span>
              ) : (
                <span className="text-[10px] text-white/20">
                  {getTierThreshold(skill.tier) * 100}%
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Skill detail panel */}
      <AnimatePresence>
        {selectedSkill && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{selectedSkill.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white/90">
                  {isKo ? selectedSkill.name.ko : selectedSkill.name.en}
                </p>
                <p className="text-[11px] text-white/50">
                  {isKo ? selectedSkill.description.ko : selectedSkill.description.en}
                </p>
              </div>
            </div>
            <div className="space-y-1 mt-2">
              <p className="text-[10px] text-white/40 font-medium">
                {isKo ? "필요 조건:" : "Requirements:"}
              </p>
              {selectedSkill.requirements.map((req) => {
                const current = dna[req.axis];
                const met = current >= req.threshold;
                return (
                  <div key={req.axis} className="flex items-center gap-2 text-[10px]">
                    <span className={met ? "text-green-400" : "text-red-400"}>
                      {met ? "✓" : "✗"}
                    </span>
                    <span className="text-white/50">{req.axis}</span>
                    <span className="text-white/30">
                      {(current * 100).toFixed(0)}% / {(req.threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
            {Object.keys(selectedSkill.bonuses).length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-white/40 font-medium">
                  {isKo ? "보너스:" : "Bonuses:"}
                </p>
                <div className="flex gap-2 mt-1">
                  {Object.entries(selectedSkill.bonuses).map(([stat, value]) => (
                    <span key={stat} className="text-[10px] text-yellow-400/70">
                      +{value} {stat.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
