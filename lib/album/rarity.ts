/**
 * Milestone rarity system for the collection album.
 *
 * Each milestone type is assigned a rarity tier that determines its
 * visual treatment, colour badge, and collector value.
 */

export type RarityTier = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type RarityMeta = {
  tier: RarityTier;
  label: { ko: string; en: string };
  color: string;
  glow: string;
};

const RARITY_MAP: Record<string, RarityMeta> = {
  first_chat: {
    tier: "common",
    label: { ko: "일반", en: "Common" },
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.15)",
  },
  dream: {
    tier: "uncommon",
    label: { ko: "비범", en: "Uncommon" },
    color: "#22c55e",
    glow: "rgba(34,197,94,0.18)",
  },
  artifact_creation: {
    tier: "uncommon",
    label: { ko: "비범", en: "Uncommon" },
    color: "#22c55e",
    glow: "rgba(34,197,94,0.18)",
  },
  social_encounter: {
    tier: "uncommon",
    label: { ko: "비범", en: "Uncommon" },
    color: "#22c55e",
    glow: "rgba(34,197,94,0.18)",
  },
  evolution: {
    tier: "rare",
    label: { ko: "희귀", en: "Rare" },
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.22)",
  },
  self_naming: {
    tier: "rare",
    label: { ko: "희귀", en: "Rare" },
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.22)",
  },
  personality_evolution: {
    tier: "epic",
    label: { ko: "에픽", en: "Epic" },
    color: "#a855f7",
    glow: "rgba(168,85,247,0.25)",
  },
  perspective_journal: {
    tier: "epic",
    label: { ko: "에픽", en: "Epic" },
    color: "#a855f7",
    glow: "rgba(168,85,247,0.25)",
  },
  species_emergence: {
    tier: "legendary",
    label: { ko: "전설", en: "Legendary" },
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.30)",
  },
};

const DEFAULT_RARITY: RarityMeta = {
  tier: "common",
  label: { ko: "일반", en: "Common" },
  color: "#94a3b8",
  glow: "rgba(148,163,184,0.15)",
};

export function getRarity(milestoneType: string): RarityMeta {
  return RARITY_MAP[milestoneType] ?? DEFAULT_RARITY;
}

/** All known milestone types used to calculate collection completeness. */
export const ALL_MILESTONE_TYPES = Object.keys(RARITY_MAP);

export function getCollectionCompleteness(collectedTypes: string[]): {
  collected: number;
  total: number;
  percent: number;
} {
  const unique = new Set(collectedTypes);
  const collected = ALL_MILESTONE_TYPES.filter((t) => unique.has(t)).length;
  const total = ALL_MILESTONE_TYPES.length;
  return { collected, total, percent: total > 0 ? Math.round((collected / total) * 100) : 0 };
}
