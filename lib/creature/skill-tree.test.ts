import { describe, expect, it } from "vitest";
import { getUnlockedSkills, getNearUnlockSkills, getSkillsByBranch, SKILL_TREE } from "./skill-tree";
import type { CreatureDNA } from "@/lib/genome/dna";

function makeDNA(overrides: Partial<CreatureDNA> = {}): CreatureDNA {
  return {
    warmth: 0.5, analytical: 0.5, creativity: 0.5, empathy: 0.5,
    playfulness: 0.5, stability: 0.5, curiosity: 0.5, intensity: 0.5,
    independence: 0.5, resilience: 0.5, openness: 0.5, intuitive: 0.5,
    verbal: 0.5, adaptability: 0.5, expressiveness: 0.5, sensitivity: 0.5,
    ...overrides,
  } as CreatureDNA;
}

describe("Skill Tree System", () => {
  it("unlocks tier 1 skills with sufficient DNA", () => {
    const skills = getUnlockedSkills(makeDNA({ analytical: 0.4 }), 1);
    const hasPatternRecognition = skills.some((s) => s.id === "pattern_recognition");
    expect(hasPatternRecognition).toBe(true);
  });

  it("locks tier 3 skills for low gen level", () => {
    const skills = getUnlockedSkills(makeDNA({ analytical: 1.0 }), 1);
    const hasPredictive = skills.some((s) => s.id === "predictive_analysis");
    expect(hasPredictive).toBe(false); // Requires gen level 4
  });

  it("unlocks tier 3 skills with high DNA and gen level", () => {
    const skills = getUnlockedSkills(makeDNA({ analytical: 0.8 }), 5);
    const hasPredictive = skills.some((s) => s.id === "predictive_analysis");
    expect(hasPredictive).toBe(true);
  });

  it("identifies near-unlock skills", () => {
    const nearSkills = getNearUnlockSkills(makeDNA({ empathy: 0.25 }), 1);
    const hasEmotionalRead = nearSkills.some((s) => s.id === "emotional_read");
    expect(hasEmotionalRead).toBe(true); // 0.25 is within 0.1 of 0.3 threshold
  });

  it("organizes skills by branch", () => {
    const branches = getSkillsByBranch();
    expect(branches.size).toBeGreaterThan(0);
    expect(branches.has("analytical")).toBe(true);
    expect(branches.has("empathy")).toBe(true);
  });

  it("has 18 total skills", () => {
    expect(SKILL_TREE.length).toBe(18);
  });

  it("all skills have valid tiers", () => {
    for (const skill of SKILL_TREE) {
      expect([1, 2, 3]).toContain(skill.tier);
    }
  });
});
