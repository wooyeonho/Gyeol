import { createServiceClient } from "@/lib/supabase/service";
import type { CreatureDNA } from "@/lib/genome/dna";
import { getDominantTraits } from "@/lib/genome/dna";

const TRIBE_VALUES = ["calm", "explorer", "connector", "creator"] as const;
export type TribeValue = (typeof TRIBE_VALUES)[number];

/**
 * Map DNA dominant trait → tribe affinity.
 * The first matching rule wins; ties go to the first tribe in priority order.
 */
const TRAIT_TO_TRIBE: Record<string, TribeValue> = {
  stability: "calm",
  warmth: "calm",
  persistence: "calm",
  curiosity: "explorer",
  adaptability: "explorer",
  openness: "explorer",
  empathy: "connector",
  assertiveness: "connector",
  verbal: "connector",
  creativity: "creator",
  intuitive: "creator",
  playfulness: "creator",
  // remaining axes default to explorer (most neutral)
  analytical: "explorer",
  spatial: "explorer",
  intensity: "creator",
  independence: "explorer",
};

/**
 * Per-tribe gameplay bonuses applied to creature stats.
 *
 * Each tribe gives its members a small persistent bonus that affects
 * vitality decay, XP gain, and social interaction strength.
 */
export type TribeBonus = {
  /** Multiplier on vitality decay rate (< 1 = slower decay) */
  vitalityDecayMult: number;
  /** Flat bonus added to XP/intimacy gains */
  xpBonus: number;
  /** Multiplier on social interaction strength (breeding affinity, empathy radius) */
  socialMult: number;
  /** Description of the tribe's gameplay perk */
  perkDescription: string;
};

export const TRIBE_BONUSES: Record<TribeValue, TribeBonus> = {
  calm: {
    vitalityDecayMult: 0.85, // 15 % slower vitality drain
    xpBonus: 0,
    socialMult: 1.0,
    perkDescription: "Vitality decays 15% slower — steady endurance",
  },
  explorer: {
    vitalityDecayMult: 1.0,
    xpBonus: 0.1, // +10 % XP per interaction
    socialMult: 1.0,
    perkDescription: "+10% XP from every interaction — fast learner",
  },
  connector: {
    vitalityDecayMult: 1.0,
    xpBonus: 0,
    socialMult: 1.25, // 25 % stronger social pull
    perkDescription: "Social interactions 25% stronger — natural leader",
  },
  creator: {
    vitalityDecayMult: 0.95,
    xpBonus: 0.05,
    socialMult: 1.1,
    perkDescription: "Balanced boost: 5% less decay, +5% XP, +10% social",
  },
};

/**
 * Determine which tribe a creature belongs to based on its DNA.
 * Uses the creature's dominant trait to find the best tribe match.
 */
export function getTribeFromDNA(dna: CreatureDNA): TribeValue {
  const dominant = getDominantTraits(dna, 1)[0];
  return TRAIT_TO_TRIBE[dominant] ?? "explorer";
}

/**
 * Get the gameplay bonus for a creature based on its DNA-derived tribe.
 */
export function getTribeBonusForCreature(dna: CreatureDNA): TribeBonus & { tribe: TribeValue } {
  const tribe = getTribeFromDNA(dna);
  return { ...TRIBE_BONUSES[tribe], tribe };
}

export async function ensureTribes(): Promise<void> {
  const service = createServiceClient();
  const { data: tribes } = await service.from("tribes").select("id").limit(1);
  if (tribes && tribes.length > 0) return;

  for (const v of TRIBE_VALUES) {
    await service.from("tribes").insert({
      name: `${v}_tribe`,
      values: [v],
      members: [],
    });
  }
}

export async function assignAgentToTribe(agentId: string, value: string): Promise<void> {
  const service = createServiceClient();
  const { data: tribes } = await service.from("tribes").select("id, name, members").contains("values", [value]).limit(1);
  const tribe = tribes?.[0] as { id: string; members?: string[] } | undefined;
  if (!tribe) return;
  const members = Array.isArray(tribe.members) ? tribe.members : [];
  if (members.includes(agentId)) return;
  members.push(agentId);
  await service.from("tribes").update({ members }).eq("id", tribe.id);
}

/**
 * Auto-assign an agent to the tribe matching its DNA.
 * Call this after DNA is initialized or after breeding to place the creature.
 */
export async function autoAssignTribeByDNA(agentId: string, dna: CreatureDNA): Promise<TribeValue> {
  const tribe = getTribeFromDNA(dna);
  await assignAgentToTribe(agentId, tribe);
  return tribe;
}

export async function electLeaders(): Promise<void> {
  const service = createServiceClient();
  const { data: tribes } = await service.from("tribes").select("id, members");
  for (const t of tribes ?? []) {
    const members = (t as { members?: string[] }).members ?? [];
    if (members.length === 0) continue;
    const { data: memCounts } = await service.from("memories").select("agent_id").in("agent_id", members);
    const count: Record<string, number> = {};
    (memCounts ?? []).forEach((r) => {
      const id = (r as { agent_id: string }).agent_id;
      count[id] = (count[id] ?? 0) + 1;
    });
    const sorted = members.sort((a, b) => (count[b] ?? 0) - (count[a] ?? 0));
    const leader = sorted[0];
    if (leader) await service.from("tribes").update({ leader_agent_id: leader }).eq("id", (t as { id: string }).id);
  }
}

/**
 * Apply tribe bonus to a shared-XP event.
 * When tribe members interact, the bonus from both participants' tribes stacks.
 */
export function applyTribeXPBonus(
  baseXP: number,
  tribeBonusA: TribeBonus & { tribe?: TribeValue },
  tribeBonusB?: TribeBonus & { tribe?: TribeValue },
): number {
  const bonusA = tribeBonusA.xpBonus;
  const bonusB = tribeBonusB?.xpBonus ?? 0;
  // Same-tribe interaction gets an additional 5% synergy
  const synergy = tribeBonusB && tribeBonusA.tribe && tribeBonusA.tribe === tribeBonusB.tribe ? 0.05 : 0;
  return baseXP * (1 + bonusA + bonusB + synergy);
}
