/**
 * Codex System — Rewards and progression for Species Codex discovery.
 *
 * Tracks discovery rewards, rarity classification based on global counts,
 * completion milestones, and undiscovered species hints.
 * Works alongside lib/creature/species-codex.ts which handles the
 * localStorage-based collection tracking.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface CodexReward {
  coins: number;
  evolutionPoints: number;
  bonusLabel?: string;
}

export type CodexRarity = "common" | "uncommon" | "rare" | "ultra-rare";

export interface CodexMilestone {
  /** Completion percentage threshold */
  threshold: number;
  label: { ko: string; en: string };
  reward: CodexReward;
}

// ─── Milestones ─────────────────────────────────────────────────

export const CODEX_MILESTONES: CodexMilestone[] = [
  {
    threshold: 25,
    label: { ko: "초보 탐험가", en: "Novice Explorer" },
    reward: { coins: 200, evolutionPoints: 50, bonusLabel: "25% Codex" },
  },
  {
    threshold: 50,
    label: { ko: "숙련된 수집가", en: "Seasoned Collector" },
    reward: { coins: 500, evolutionPoints: 150, bonusLabel: "50% Codex" },
  },
  {
    threshold: 75,
    label: { ko: "마스터 학자", en: "Master Scholar" },
    reward: { coins: 1000, evolutionPoints: 300, bonusLabel: "75% Codex" },
  },
  {
    threshold: 100,
    label: { ko: "전설의 도감 완성자", en: "Legendary Codex Completionist" },
    reward: { coins: 3000, evolutionPoints: 1000, bonusLabel: "100% Codex" },
  },
];

// ─── Completion ─────────────────────────────────────────────────

/**
 * Get codex completion stats.
 * @param discovered - Array of discovered species IDs
 * @param totalSpecies - Total number of species in the catalog
 */
export function getCodexCompletion(
  discovered: string[],
  totalSpecies: number,
): { count: number; total: number; percentage: number } {
  const count = discovered.length;
  const total = totalSpecies;
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return { count, total, percentage };
}

// ─── Undiscovered Hints ─────────────────────────────────────────

/** Trait-family adjectives for vague hints (English) */
const HINT_ADJECTIVES_EN: Record<string, string> = {
  analytical: "calculating",
  intuitive: "mystical",
  verbal: "eloquent",
  spatial: "dimensional",
  warmth: "warm-hearted",
  intensity: "fierce",
  stability: "steadfast",
  openness: "free-spirited",
  assertiveness: "commanding",
  empathy: "compassionate",
  playfulness: "mischievous",
  independence: "solitary",
  curiosity: "inquisitive",
  persistence: "unyielding",
  adaptability: "shapeshifting",
  creativity: "imaginative",
};

/** Trait-family adjectives for vague hints (Korean) */

const HINT_ADJECTIVES_KO: Record<string, string> = {
  analytical: "계산적인",
  intuitive: "신비로운",
  verbal: "언변이 좋은",
  spatial: "차원을 넘나드는",
  warmth: "따뜻한 마음의",
  intensity: "격렬한",
  stability: "의연한",
  openness: "자유로운",
  assertiveness: "위엄 있는",
  empathy: "자비로운",
  playfulness: "장난스러운",
  independence: "고독한",
  curiosity: "탐구하는",
  persistence: "굳건한",
  adaptability: "변형하는",
  creativity: "상상력 넘치는",
};

/**
 * Generate vague hints about undiscovered species.
 * Returns up to 3 hints describing trait families of undiscovered species
 * without revealing the exact species name.
 *
 * @param discovered - Array of discovered species IDs
 * @param allSpecies - Array of all species IDs (format: "cog/emo/soc")
 */
export function getUndiscoveredHints(
  discovered: string[],
  allSpecies: string[],
): string[] {
  const discoveredSet = new Set(discovered);
  const undiscovered = allSpecies.filter((id) => !discoveredSet.has(id));

  if (undiscovered.length === 0) return [];

  // Pick up to 3 undiscovered species for hints
  const hintCount = Math.min(3, undiscovered.length);
  // Deterministic selection: spread evenly across the undiscovered list
  const step = Math.max(1, Math.floor(undiscovered.length / hintCount));
  const hints: string[] = [];

  for (let i = 0; i < hintCount; i++) {
    const speciesId = undiscovered[i * step];
    const parts = speciesId.split("/");
    if (parts.length !== 3) continue;

    const [cog, emo, soc] = parts;
    const adjCog = HINT_ADJECTIVES_EN[cog] ?? "mysterious";
    const adjEmo = HINT_ADJECTIVES_EN[emo] ?? "enigmatic";
    const adjSoc = HINT_ADJECTIVES_EN[soc] ?? "unknown";

    hints.push(
      `A ${adjCog}, ${adjEmo} creature with ${adjSoc} tendencies lurks undiscovered...`,
    );
  }

  return hints;
}

// ─── Discovery Rewards ──────────────────────────────────────────

/** Base reward values for discovering any new species */
const BASE_COINS = 50;
const BASE_EVOLUTION_POINTS = 15;

/** Rarity multipliers for discovery rewards */
const RARITY_MULTIPLIERS: Record<CodexRarity, number> = {
  "common": 1,
  "uncommon": 1.5,
  "rare": 2.5,
  "ultra-rare": 5,
};

/**
 * Calculate reward for discovering a new species.
 * Reward scales with species name complexity (longer names = rarer variants).
 *
 * @param newSpecies - The species ID being discovered (format: "cog/emo/soc")
 */
export function calculateCodexReward(newSpecies: string): CodexReward {
  // Derive a simple hash from the species ID for deterministic bonus variance
  let hash = 0;
  for (let i = 0; i < newSpecies.length; i++) {
    hash = ((hash << 5) - hash + newSpecies.charCodeAt(i)) | 0;
  }
  const variance = 0.8 + (Math.abs(hash) % 40) / 100; // 0.80..1.19

  const coins = Math.round(BASE_COINS * variance);
  const evolutionPoints = Math.round(BASE_EVOLUTION_POINTS * variance);

  return { coins, evolutionPoints };
}

// ─── Rarity Classification ──────────────────────────────────────

/**
 * Classify a species' rarity based on how many players globally own it.
 * Thresholds:
 *   - ultra-rare: bottom 5%  (owned by fewer than 5% of players)
 *   - rare: bottom 15%
 *   - uncommon: bottom 40%
 *   - common: everything else
 *
 * @param species - Species ID
 * @param globalCounts - Map from species ID to number of players who own it
 */
export function getCodexRarity(
  species: string,
  globalCounts: Record<string, number>,
): CodexRarity {
  const counts = Object.values(globalCounts);
  if (counts.length === 0) return "common";

  const maxCount = Math.max(...counts);
  if (maxCount === 0) return "common";

  const speciesCount = globalCounts[species] ?? 0;
  const ratio = speciesCount / maxCount;

  if (ratio < 0.05) return "ultra-rare";
  if (ratio < 0.15) return "rare";
  if (ratio < 0.40) return "uncommon";
  return "common";
}

/**
 * Calculate a discovery reward that accounts for species rarity.
 * Combines base reward with rarity multiplier.
 */
export function calculateRarityBoostedReward(
  newSpecies: string,
  globalCounts: Record<string, number>,
): CodexReward {
  const base = calculateCodexReward(newSpecies);
  const rarity = getCodexRarity(newSpecies, globalCounts);
  const multiplier = RARITY_MULTIPLIERS[rarity];

  return {
    coins: Math.round(base.coins * multiplier),
    evolutionPoints: Math.round(base.evolutionPoints * multiplier),
    bonusLabel: rarity !== "common" ? `${rarity} discovery` : undefined,
  };
}

/**
 * Get milestones that the player has newly reached.
 * Returns milestones where the player just crossed the threshold
 * (i.e., previous percentage was below but current is at or above).
 */
export function getNewlyReachedMilestones(
  previousPercentage: number,
  currentPercentage: number,
): CodexMilestone[] {
  return CODEX_MILESTONES.filter(
    (m) => previousPercentage < m.threshold && currentPercentage >= m.threshold,
  );
}
