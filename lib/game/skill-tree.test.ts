import { describe, expect, it } from "vitest";
import {
  isSkillUnlocked,
  getSkillsByBranch,
  getUnlockedSkills,
  getSkillTreeProgress,
  calculateSkillBonuses,
  getNextSkill,
  getBranchInfo,
  getTierThreshold,
  SKILL_CATALOG,
} from "./skill-tree";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DEFAULT_NEW_DNA_AXES } from "@/lib/genome/dna";

const makeDNA = (overrides: Partial<CreatureDNA>): CreatureDNA => ({
  analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
  warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
  assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
  curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
  ...DEFAULT_NEW_DNA_AXES,
  ...overrides,
});

describe("skill-tree", () => {
  it("has 20 skills total (5 per branch × 4 branches)", () => {
    expect(SKILL_CATALOG).toHaveLength(20);
    expect(getSkillsByBranch("cognitive")).toHaveLength(5);
    expect(getSkillsByBranch("emotional")).toHaveLength(5);
    expect(getSkillsByBranch("social")).toHaveLength(5);
    expect(getSkillsByBranch("meta")).toHaveLength(5);
  });

  it("tier 1 skills unlock at 0.3 threshold", () => {
    const lowDNA = makeDNA({ analytical: 0.2, empathy: 0.2, curiosity: 0.2 });
    const tier1Cognitive = SKILL_CATALOG.find((s) => s.id === "pattern_recognition")!;
    expect(isSkillUnlocked(tier1Cognitive, lowDNA)).toBe(false);

    const highDNA = makeDNA({ analytical: 0.35 });
    expect(isSkillUnlocked(tier1Cognitive, highDNA)).toBe(true);
  });

  it("tier 5 skills require high DNA across multiple axes", () => {
    const geniusSkill = SKILL_CATALOG.find((s) => s.id === "genius_insight")!;
    const balancedDNA = makeDNA({});
    expect(isSkillUnlocked(geniusSkill, balancedDNA)).toBe(false);

    const geniusDNA = makeDNA({ analytical: 0.95, intuitive: 0.75, verbal: 0.65 });
    expect(isSkillUnlocked(geniusSkill, geniusDNA)).toBe(true);
  });

  it("getUnlockedSkills returns correct count for balanced DNA", () => {
    // Balanced DNA at 0.5 → should unlock tier 1 (0.3) and tier 2 (0.5) skills
    const unlocked = getUnlockedSkills(makeDNA({}));
    // Each branch tier1 needs 0.3 (pass), tier2 needs 0.5 (pass at boundary)
    expect(unlocked.length).toBeGreaterThanOrEqual(4); // At least all tier 1s
  });

  it("getSkillTreeProgress returns percentage per branch", () => {
    const progress = getSkillTreeProgress(makeDNA({}));
    for (const branch of ["cognitive", "emotional", "social", "meta"] as const) {
      expect(progress[branch].total).toBe(5);
      expect(progress[branch].unlocked).toBeGreaterThanOrEqual(0);
      expect(progress[branch].percentage).toBeGreaterThanOrEqual(0);
      expect(progress[branch].percentage).toBeLessThanOrEqual(100);
    }
  });

  it("calculateSkillBonuses sums bonuses from all unlocked skills", () => {
    // Max DNA → all skills unlocked
    const maxDNA = makeDNA({
      analytical: 1, intuitive: 1, verbal: 1, spatial: 1,
      warmth: 1, intensity: 1, stability: 1, openness: 1,
      assertiveness: 1, empathy: 1, playfulness: 1, independence: 1,
      curiosity: 1, persistence: 1, adaptability: 1, creativity: 1,
    });
    const bonuses = calculateSkillBonuses(maxDNA);
    // With all 20 skills, there should be substantial bonuses
    expect(Object.keys(bonuses).length).toBeGreaterThan(0);
    const totalBonus = Object.values(bonuses).reduce((a, b) => a + b, 0);
    expect(totalBonus).toBeGreaterThan(50);
  });

  it("getNextSkill returns the closest unlockable skill", () => {
    const dna = makeDNA({ analytical: 0.35, intuitive: 0.35 }); // Tier 1 unlocked
    const next = getNextSkill(dna, "cognitive");
    expect(next).not.toBeNull();
    expect(next!.skill.tier).toBe(2); // Next is tier 2
    expect(next!.progress).toBeGreaterThan(0);
    expect(next!.progress).toBeLessThan(100);
  });

  it("getNextSkill returns null when all branch skills unlocked", () => {
    const maxDNA = makeDNA({
      analytical: 1, intuitive: 1, verbal: 1, spatial: 1,
    });
    const next = getNextSkill(maxDNA, "cognitive");
    expect(next).toBeNull();
  });

  it("getBranchInfo returns valid data for all branches", () => {
    for (const branch of ["cognitive", "emotional", "social", "meta"] as const) {
      const info = getBranchInfo(branch);
      expect(info.label.ko).toBeTruthy();
      expect(info.label.en).toBeTruthy();
      expect(info.color).toMatch(/^#/);
      expect(info.icon).toBeTruthy();
    }
  });

  it("getTierThreshold returns correct values", () => {
    expect(getTierThreshold(1)).toBe(0.3);
    expect(getTierThreshold(2)).toBe(0.5);
    expect(getTierThreshold(3)).toBe(0.65);
    expect(getTierThreshold(4)).toBe(0.8);
    expect(getTierThreshold(5)).toBe(0.9);
  });

  it("all skills have unique IDs", () => {
    const ids = SKILL_CATALOG.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("skill tiers are sorted within each branch", () => {
    for (const branch of ["cognitive", "emotional", "social", "meta"] as const) {
      const skills = getSkillsByBranch(branch);
      for (let i = 0; i < skills.length; i++) {
        expect(skills[i].tier).toBe(i + 1);
      }
    }
  });
});
