import { describe, expect, it } from "vitest";
import { generateDailyQuests } from "./quests";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DEFAULT_NEW_DNA_AXES } from "@/lib/genome/dna";

function makeDNA(): CreatureDNA {
  return {
    analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
    warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
    assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
    curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
    ...DEFAULT_NEW_DNA_AXES,
  };
}

describe("Quest System", () => {
  it("generates 3 quests", () => {
    const quests = generateDailyQuests(makeDNA(), 1, 12345);
    expect(quests.length).toBe(3);
  });

  it("generates quests of varying difficulty", () => {
    const quests = generateDailyQuests(makeDNA(), 1, 12345);
    const difficulties = quests.map((q) => q.difficulty);
    expect(difficulties).toContain("easy");
    expect(difficulties).toContain("medium");
  });

  it("generates consistent quests with same seed", () => {
    const a = generateDailyQuests(makeDNA(), 1, 42);
    const b = generateDailyQuests(makeDNA(), 1, 42);
    expect(a.map((q) => q.title.en)).toEqual(b.map((q) => q.title.en));
  });

  it("generates different quests with different seeds", () => {
    const a = generateDailyQuests(makeDNA(), 1, 1);
    const b = generateDailyQuests(makeDNA(), 1, 99999);
    // At least one quest should differ
    const titlesA = a.map((q) => q.title.en).sort();
    const titlesB = b.map((q) => q.title.en).sort();
    expect(titlesA).not.toEqual(titlesB);
  });

  it("all quests have required fields", () => {
    const quests = generateDailyQuests(makeDNA(), 1, 12345);
    for (const q of quests) {
      expect(q.id).toBeTruthy();
      expect(q.type).toBeTruthy();
      expect(q.title.ko).toBeTruthy();
      expect(q.title.en).toBeTruthy();
      expect(q.rewardCoins).toBeGreaterThan(0);
      expect(q.rewardEvo).toBeGreaterThan(0);
    }
  });
});
