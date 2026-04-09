/**
 * DNA-based Skill Tree System
 *
 * Skills are unlocked based on DNA axis thresholds. As a creature's DNA
 * evolves through conversation, new abilities become available.
 *
 * 4 branches matching DNA groups: Cognitive, Emotional, Social, Meta.
 * Each branch has 5 tiers (DNA threshold: 0.3 → 0.5 → 0.65 → 0.8 → 0.9).
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export type SkillBranch = "cognitive" | "emotional" | "social" | "meta";

export interface Skill {
  id: string;
  branch: SkillBranch;
  tier: number; // 1–5
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: string;
  /** DNA axes that must meet the threshold */
  requirements: { axis: keyof CreatureDNA; threshold: number }[];
  /** Stat bonuses when skill is active */
  bonuses: Partial<Record<string, number>>;
}

const TIER_THRESHOLDS = [0.3, 0.5, 0.65, 0.8, 0.9];

export const SKILL_CATALOG: Skill[] = [
  // ── Cognitive Branch ──────────────────────────────────────────────────
  {
    id: "pattern_recognition",
    branch: "cognitive",
    tier: 1,
    name: { ko: "패턴 인식", en: "Pattern Recognition" },
    description: { ko: "반복 패턴을 빠르게 감지한다", en: "Quickly detects repeating patterns" },
    icon: "🔍",
    requirements: [{ axis: "analytical", threshold: 0.3 }],
    bonuses: { wis: 3 },
  },
  {
    id: "logical_deduction",
    branch: "cognitive",
    tier: 2,
    name: { ko: "논리적 추론", en: "Logical Deduction" },
    description: { ko: "복잡한 문제를 체계적으로 풀어낸다", en: "Solves complex problems systematically" },
    icon: "🧩",
    requirements: [{ axis: "analytical", threshold: 0.5 }, { axis: "intuitive", threshold: 0.4 }],
    bonuses: { atk: 5, wis: 3 },
  },
  {
    id: "speed_reading",
    branch: "cognitive",
    tier: 3,
    name: { ko: "속독", en: "Speed Reading" },
    description: { ko: "정보를 순식간에 흡수한다", en: "Absorbs information instantly" },
    icon: "📚",
    requirements: [{ axis: "verbal", threshold: 0.65 }, { axis: "analytical", threshold: 0.5 }],
    bonuses: { spd: 5, wis: 5 },
  },
  {
    id: "spatial_mastery",
    branch: "cognitive",
    tier: 4,
    name: { ko: "공간 지배", en: "Spatial Mastery" },
    description: { ko: "3차원 공간을 직관적으로 파악한다", en: "Intuitively grasps 3D space" },
    icon: "🌐",
    requirements: [{ axis: "spatial", threshold: 0.8 }, { axis: "intuitive", threshold: 0.6 }],
    bonuses: { def: 8, spd: 5 },
  },
  {
    id: "genius_insight",
    branch: "cognitive",
    tier: 5,
    name: { ko: "천재적 통찰", en: "Genius Insight" },
    description: { ko: "본질을 꿰뚫어 보는 눈", en: "Sees through to the essence of things" },
    icon: "💡",
    requirements: [
      { axis: "analytical", threshold: 0.9 },
      { axis: "intuitive", threshold: 0.7 },
      { axis: "verbal", threshold: 0.6 },
    ],
    bonuses: { atk: 10, wis: 10 },
  },

  // ── Emotional Branch ──────────────────────────────────────────────────
  {
    id: "warm_heart",
    branch: "emotional",
    tier: 1,
    name: { ko: "따뜻한 마음", en: "Warm Heart" },
    description: { ko: "주변에 온기를 전한다", en: "Radiates warmth to those nearby" },
    icon: "💗",
    requirements: [{ axis: "warmth", threshold: 0.3 }],
    bonuses: { hp: 3 },
  },
  {
    id: "emotional_depth",
    branch: "emotional",
    tier: 2,
    name: { ko: "감정의 깊이", en: "Emotional Depth" },
    description: { ko: "깊은 감정을 느끼고 표현한다", en: "Feels and expresses deep emotions" },
    icon: "🌊",
    requirements: [{ axis: "intensity", threshold: 0.5 }, { axis: "openness", threshold: 0.4 }],
    bonuses: { atk: 4, cha: 4 },
  },
  {
    id: "inner_peace",
    branch: "emotional",
    tier: 3,
    name: { ko: "내면의 평화", en: "Inner Peace" },
    description: { ko: "흔들림 없는 안정감", en: "Unshakeable inner stability" },
    icon: "☮️",
    requirements: [{ axis: "stability", threshold: 0.65 }, { axis: "warmth", threshold: 0.5 }],
    bonuses: { def: 6, hp: 5 },
  },
  {
    id: "empathic_shield",
    branch: "emotional",
    tier: 4,
    name: { ko: "공감의 방패", en: "Empathic Shield" },
    description: { ko: "타인의 감정을 느껴 공격을 예측한다", en: "Senses emotions to predict attacks" },
    icon: "🔮",
    requirements: [{ axis: "openness", threshold: 0.8 }, { axis: "stability", threshold: 0.6 }],
    bonuses: { def: 10, wis: 5 },
  },
  {
    id: "passion_burst",
    branch: "emotional",
    tier: 5,
    name: { ko: "열정 폭발", en: "Passion Burst" },
    description: { ko: "감정의 힘을 극한으로 폭발시킨다", en: "Unleashes emotional power to the extreme" },
    icon: "🔥",
    requirements: [
      { axis: "intensity", threshold: 0.9 },
      { axis: "warmth", threshold: 0.7 },
      { axis: "openness", threshold: 0.6 },
    ],
    bonuses: { atk: 12, hp: 8 },
  },

  // ── Social Branch ──────────────────────────────────────────────────
  {
    id: "friendly_aura",
    branch: "social",
    tier: 1,
    name: { ko: "친화의 오라", en: "Friendly Aura" },
    description: { ko: "자연스러운 친근함을 풍긴다", en: "Exudes natural friendliness" },
    icon: "🤗",
    requirements: [{ axis: "empathy", threshold: 0.3 }],
    bonuses: { cha: 3 },
  },
  {
    id: "pack_tactics",
    branch: "social",
    tier: 2,
    name: { ko: "무리 전술", en: "Pack Tactics" },
    description: { ko: "팀과 함께할 때 더 강해진다", en: "Grows stronger with the pack" },
    icon: "🐺",
    requirements: [{ axis: "assertiveness", threshold: 0.5 }, { axis: "empathy", threshold: 0.4 }],
    bonuses: { atk: 3, def: 3 },
  },
  {
    id: "joyful_dance",
    branch: "social",
    tier: 3,
    name: { ko: "기쁨의 춤", en: "Joyful Dance" },
    description: { ko: "즐거운 기운으로 적을 혼란시킨다", en: "Confuses foes with joyful energy" },
    icon: "💃",
    requirements: [{ axis: "playfulness", threshold: 0.65 }, { axis: "assertiveness", threshold: 0.5 }],
    bonuses: { spd: 6, cha: 5 },
  },
  {
    id: "lone_wolf",
    branch: "social",
    tier: 4,
    name: { ko: "외로운 늑대", en: "Lone Wolf" },
    description: { ko: "혼자일 때 집중력이 극대화된다", en: "Maximizes focus when alone" },
    icon: "🌙",
    requirements: [{ axis: "independence", threshold: 0.8 }, { axis: "assertiveness", threshold: 0.6 }],
    bonuses: { atk: 8, spd: 5 },
  },
  {
    id: "charisma_overload",
    branch: "social",
    tier: 5,
    name: { ko: "카리스마 과부하", en: "Charisma Overload" },
    description: { ko: "모두를 매료시키는 압도적 존재감", en: "Overwhelmingly captivating presence" },
    icon: "👑",
    requirements: [
      { axis: "playfulness", threshold: 0.9 },
      { axis: "assertiveness", threshold: 0.7 },
      { axis: "empathy", threshold: 0.6 },
    ],
    bonuses: { cha: 15, hp: 5 },
  },

  // ── Meta Branch ──────────────────────────────────────────────────
  {
    id: "curious_mind",
    branch: "meta",
    tier: 1,
    name: { ko: "호기심", en: "Curious Mind" },
    description: { ko: "새로운 것에 대한 끝없는 관심", en: "Endless interest in the new" },
    icon: "❓",
    requirements: [{ axis: "curiosity", threshold: 0.3 }],
    bonuses: { wis: 2, spd: 2 },
  },
  {
    id: "iron_will",
    branch: "meta",
    tier: 2,
    name: { ko: "강철 의지", en: "Iron Will" },
    description: { ko: "포기하지 않는 끈기", en: "Relentless determination" },
    icon: "⚙️",
    requirements: [{ axis: "persistence", threshold: 0.5 }, { axis: "curiosity", threshold: 0.4 }],
    bonuses: { hp: 4, def: 4 },
  },
  {
    id: "shapeshifter",
    branch: "meta",
    tier: 3,
    name: { ko: "변신술", en: "Shapeshifter" },
    description: { ko: "상황에 맞게 자유롭게 변화한다", en: "Adapts freely to any situation" },
    icon: "🦎",
    requirements: [{ axis: "adaptability", threshold: 0.65 }, { axis: "creativity", threshold: 0.5 }],
    bonuses: { def: 5, spd: 5 },
  },
  {
    id: "creative_surge",
    branch: "meta",
    tier: 4,
    name: { ko: "창조의 파도", en: "Creative Surge" },
    description: { ko: "상상력으로 불가능을 가능하게 한다", en: "Makes the impossible possible through imagination" },
    icon: "🎨",
    requirements: [{ axis: "creativity", threshold: 0.8 }, { axis: "adaptability", threshold: 0.6 }],
    bonuses: { atk: 7, cha: 7 },
  },
  {
    id: "transcendence",
    branch: "meta",
    tier: 5,
    name: { ko: "초월", en: "Transcendence" },
    description: { ko: "모든 한계를 넘어선 존재", en: "A being beyond all limits" },
    icon: "🌟",
    requirements: [
      { axis: "curiosity", threshold: 0.9 },
      { axis: "persistence", threshold: 0.7 },
      { axis: "adaptability", threshold: 0.7 },
      { axis: "creativity", threshold: 0.8 },
    ],
    bonuses: { hp: 8, atk: 8, def: 5, spd: 5 },
  },
];

/** Check if a skill is unlocked for the given DNA */
export function isSkillUnlocked(skill: Skill, dna: CreatureDNA): boolean {
  return skill.requirements.every((req) => dna[req.axis] >= req.threshold);
}

/** Get all skills for a branch */
export function getSkillsByBranch(branch: SkillBranch): Skill[] {
  return SKILL_CATALOG.filter((s) => s.branch === branch);
}

/** Get all unlocked skills for a creature's DNA */
export function getUnlockedSkills(dna: CreatureDNA): Skill[] {
  return SKILL_CATALOG.filter((s) => isSkillUnlocked(s, dna));
}

/** Get skill tree progress per branch */
export function getSkillTreeProgress(dna: CreatureDNA): Record<SkillBranch, { unlocked: number; total: number; percentage: number }> {
  const branches: SkillBranch[] = ["cognitive", "emotional", "social", "meta"];
  const result = {} as Record<SkillBranch, { unlocked: number; total: number; percentage: number }>;

  for (const branch of branches) {
    const branchSkills = getSkillsByBranch(branch);
    const unlockedCount = branchSkills.filter((s) => isSkillUnlocked(s, dna)).length;
    result[branch] = {
      unlocked: unlockedCount,
      total: branchSkills.length,
      percentage: Math.round((unlockedCount / branchSkills.length) * 100),
    };
  }

  return result;
}

/** Calculate total stat bonuses from all unlocked skills */
export function calculateSkillBonuses(dna: CreatureDNA): Record<string, number> {
  const unlocked = getUnlockedSkills(dna);
  const bonuses: Record<string, number> = {};

  for (const skill of unlocked) {
    for (const [stat, value] of Object.entries(skill.bonuses)) {
      bonuses[stat] = (bonuses[stat] ?? 0) + (value ?? 0);
    }
  }

  return bonuses;
}

/** Get the next unlockable skill (closest to threshold) for a branch */
export function getNextSkill(dna: CreatureDNA, branch: SkillBranch): { skill: Skill; progress: number } | null {
  const branchSkills = getSkillsByBranch(branch).sort((a, b) => a.tier - b.tier);

  for (const skill of branchSkills) {
    if (isSkillUnlocked(skill, dna)) continue;

    // Calculate how close the creature is to unlocking this skill
    let totalProgress = 0;
    for (const req of skill.requirements) {
      const current = dna[req.axis];
      const progress = Math.min(1, current / req.threshold);
      totalProgress += progress;
    }
    const avgProgress = totalProgress / skill.requirements.length;

    return { skill, progress: Math.round(avgProgress * 100) };
  }

  return null; // All skills in branch are unlocked
}

/** Get branch metadata for UI */
export function getBranchInfo(branch: SkillBranch): { label: { ko: string; en: string }; color: string; icon: string } {
  switch (branch) {
    case "cognitive": return { label: { ko: "인지", en: "Cognitive" }, color: "#38bdf8", icon: "🧠" };
    case "emotional": return { label: { ko: "감정", en: "Emotional" }, color: "#f472b6", icon: "💗" };
    case "social": return { label: { ko: "사교", en: "Social" }, color: "#34d399", icon: "🤝" };
    case "meta": return { label: { ko: "메타", en: "Meta" }, color: "#a78bfa", icon: "🌟" };
  }
}

/** Get tier threshold for display */
export function getTierThreshold(tier: number): number {
  return TIER_THRESHOLDS[tier - 1] ?? 1;
}
