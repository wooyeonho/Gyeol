/**
 * Re-routes skill tree tests to the canonical lib/game/skill-tree module.
 * lib/creature/skill-tree.ts was removed; all skill-tree logic lives in lib/game/skill-tree.ts.
 */
import { describe, expect, it } from "vitest";
import {
  isSkillUnlocked,
  getSkillsByBranch,
  getUnlockedSkills,
  getSkillTreeProgress,
  calculateSkillBonuses,
  getNextSkill,
  SKILL_CATALOG,
} from "@/lib/game/skill-tree";
import type { CreatureDNA } from "@/lib/genome/dna";

function makeDNA(overrides: Partial<CreatureDNA> = {}): CreatureDNA {
  return {
    analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
    warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
    assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
    curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
    ...overrides,
  } as CreatureDNA;
}

describe("Skill Tree System (via lib/game/skill-tree)", () => {
  it("unlocks tier 1 skills with sufficient DNA", () => {
    const tier1 = SKILL_CATALOG.find((s) => s.id === "pattern_recognition")!;
    expect(isSkillUnlocked(tier1, makeDNA({ analytical: 0.4 }))).toBe(true);
  });

  it("locks tier 1 skills below threshold", () => {
    const tier1 = SKILL_CATALOG.find((s) => s.id === "pattern_recognition")!;
    expect(isSkillUnlocked(tier1, makeDNA({ analytical: 0.2 }))).toBe(false);
  });

  it("getUnlockedSkills returns at least tier 1 skills for sufficient DNA", () => {
    const skills = getUnlockedSkills(makeDNA({ analytical: 0.4 }));
    const hasPatternRecognition = skills.some((s) => s.id === "pattern_recognition");
    expect(hasPatternRecognition).toBe(true);
  });

  it("high tier skills require high DNA across multiple axes", () => {
    const lowSkills = getUnlockedSkills(makeDNA({ analytical: 0.4 }));
    const hasGenius = lowSkills.some((s) => s.id === "genius_insight");
    expect(hasGenius).toBe(false);
  });

  it("getSkillsByBranch returns skills for each branch", () => {
    expect(getSkillsByBranch("cognitive").length).toBeGreaterThan(0);
    expect(getSkillsByBranch("emotional").length).toBeGreaterThan(0);
  });

  it("getSkillTreeProgress returns percentage per branch", () => {
    const progress = getSkillTreeProgress(makeDNA({}));
    for (const branch of Object.keys(progress)) {
      expect(progress[branch as keyof typeof progress].percentage).toBeGreaterThanOrEqual(0);
    }
  });

  it("calculateSkillBonuses sums bonuses from unlocked skills", () => {
    const maxDNA = makeDNA({
      analytical: 1, intuitive: 1, verbal: 1, spatial: 1,
      warmth: 1, intensity: 1, stability: 1, openness: 1,
      assertiveness: 1, empathy: 1, playfulness: 1, independence: 1,
      curiosity: 1, persistence: 1, adaptability: 1, creativity: 1,
    });
    const bonuses = calculateSkillBonuses(maxDNA);
    expect(Object.keys(bonuses).length).toBeGreaterThan(0);
  });

  it("getNextSkill returns the closest unlockable skill in a branch", () => {
    const next = getNextSkill(makeDNA({ analytical: 0.35 }), "cognitive");
    expect(next).not.toBeNull();
  });

  it("SKILL_CATALOG has skills with valid tiers", () => {
    for (const skill of SKILL_CATALOG) {
      expect([1, 2, 3, 4, 5]).toContain(skill.tier);
    }
  });
});
