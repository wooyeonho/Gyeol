/**
 * Multi-creature party system — Pokemon-inspired party/team management.
 * Users can own up to 6 creatures, with one "active" creature shown on the home screen.
 * Party composition grants synergy bonuses based on type diversity and affinity.
 */

import type { DominantType } from "@/lib/game/type-advantage";
import type { CreatureStats, StatKey } from "@/lib/game/stat-system";

export interface PartyMember {
  creatureId: string;
  name: string;
  dominantType: DominantType;
  level: number;
  stats: CreatureStats;
  isActive: boolean;
  affinity?: number; // 0–1, bond level with user
}

export interface SynergyBonus {
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  bonusType: "allStats" | "xp" | StatKey;
  bonusPercent: number; // e.g. 10 means +10%
}

export const PARTY_MAX_SIZE = 6;

/** Map from DominantType to its primary stat */
const TYPE_PRIMARY_STAT: Record<DominantType, StatKey> = {
  analytical: "atk",
  emotional: "cha",
  social: "wis",
  creative: "spd",
  balanced: "def",
};

/**
 * Calculate synergy bonuses for the current party composition.
 *
 * Rules:
 * - All different types → "Rainbow Synergy" (+10% all stats)
 * - 2+ same type → "Type Focus" (+15% that type's primary stat) — one per duplicated type
 * - High average affinity (>= 0.7) → "Bonded Team" (+5% XP)
 */
export function calculatePartySynergy(party: PartyMember[]): SynergyBonus[] {
  if (party.length === 0) return [];

  const bonuses: SynergyBonus[] = [];

  // Count types
  const typeCounts = new Map<DominantType, number>();
  for (const member of party) {
    typeCounts.set(member.dominantType, (typeCounts.get(member.dominantType) ?? 0) + 1);
  }

  const uniqueTypes = typeCounts.size;
  const allTypes: DominantType[] = ["analytical", "emotional", "social", "creative", "balanced"];

  // Rainbow Synergy: every type represented (need at least 5 members with all 5 types)
  if (uniqueTypes >= allTypes.length) {
    bonuses.push({
      name: { ko: "무지개 시너지", en: "Rainbow Synergy" },
      description: {
        ko: "모든 타입이 파티에 포함 — 전체 스탯 +10%",
        en: "All types represented — +10% all stats",
      },
      bonusType: "allStats",
      bonusPercent: 10,
    });
  }

  // Type Focus: 2+ of the same type
  for (const [type, count] of typeCounts) {
    if (count >= 2) {
      const primaryStat = TYPE_PRIMARY_STAT[type];
      bonuses.push({
        name: { ko: "타입 집중", en: "Type Focus" },
        description: {
          ko: `${type} 타입 ${count}마리 — ${primaryStat.toUpperCase()} +15%`,
          en: `${count}x ${type} — ${primaryStat.toUpperCase()} +15%`,
        },
        bonusType: primaryStat,
        bonusPercent: 15,
      });
    }
  }

  // Bonded Team: average affinity >= 0.7
  const membersWithAffinity = party.filter((m) => m.affinity !== undefined);
  if (membersWithAffinity.length > 0) {
    const avgAffinity =
      membersWithAffinity.reduce((sum, m) => sum + (m.affinity ?? 0), 0) /
      membersWithAffinity.length;
    if (avgAffinity >= 0.7) {
      bonuses.push({
        name: { ko: "유대 팀", en: "Bonded Team" },
        description: {
          ko: "높은 평균 친밀도 — XP +5%",
          en: "High average affinity — +5% XP",
        },
        bonusType: "xp",
        bonusPercent: 5,
      });
    }
  }

  return bonuses;
}

/** Calculate total party power (sum of all members' total stats) */
export function getPartyPower(party: PartyMember[]): number {
  return party.reduce((total, member) => {
    const { hp, atk, def, spd, wis, cha } = member.stats;
    return total + hp + atk + def + spd + wis + cha;
  }, 0);
}

/** Check whether another creature can be added to the party */
export function canAddToParty(party: PartyMember[]): boolean {
  return party.length < PARTY_MAX_SIZE;
}

/** Get the currently active creature (the one shown on the home screen) */
export function getActiveCreature(party: PartyMember[]): PartyMember | null {
  return party.find((m) => m.isActive) ?? null;
}

/**
 * Switch the active creature. Returns a new party array with the
 * specified creature set as active and all others deactivated.
 * If the creatureId is not found, the party is returned unchanged.
 */
export function switchActiveCreature(party: PartyMember[], creatureId: string): PartyMember[] {
  const found = party.some((m) => m.creatureId === creatureId);
  if (!found) return party;

  return party.map((m) => ({
    ...m,
    isActive: m.creatureId === creatureId,
  }));
}
