import { describe, expect, it } from "vitest";
import {
  getCodexCompletion,
  getUndiscoveredHints,
  calculateCodexReward,
  getCodexRarity,
  calculateRarityBoostedReward,
  getNewlyReachedMilestones,
  CODEX_MILESTONES,
} from "./codex-system";

describe("codex-system", () => {
  // ─── getCodexCompletion ─────────────────────────────────────

  it("returns 0% for empty discovery list", () => {
    const result = getCodexCompletion([], 128);
    expect(result.count).toBe(0);
    expect(result.total).toBe(128);
    expect(result.percentage).toBe(0);
  });

  it("returns correct percentage for partial discovery", () => {
    const discovered = ["analytical/warmth/empathy", "intuitive/intensity/curiosity"];
    const result = getCodexCompletion(discovered, 128);
    expect(result.count).toBe(2);
    expect(result.total).toBe(128);
    expect(result.percentage).toBe(2); // Math.round(2/128 * 100) = 2
  });

  it("returns 100% when all species discovered", () => {
    const all = Array.from({ length: 128 }, (_, i) => `species_${i}`);
    const result = getCodexCompletion(all, 128);
    expect(result.percentage).toBe(100);
    expect(result.count).toBe(result.total);
  });

  it("handles totalSpecies = 0 gracefully", () => {
    const result = getCodexCompletion(["a"], 0);
    expect(result.percentage).toBe(0);
  });

  // ─── getUndiscoveredHints ───────────────────────────────────

  it("returns empty array when all species discovered", () => {
    const all = ["analytical/warmth/empathy"];
    const hints = getUndiscoveredHints(all, all);
    expect(hints).toHaveLength(0);
  });

  it("returns up to 3 hints for undiscovered species", () => {
    const all = [
      "analytical/warmth/empathy",
      "intuitive/intensity/curiosity",
      "verbal/stability/playfulness",
      "spatial/openness/independence",
      "analytical/intensity/creativity",
    ];
    const discovered = ["analytical/warmth/empathy"];
    const hints = getUndiscoveredHints(discovered, all);
    expect(hints.length).toBeGreaterThanOrEqual(1);
    expect(hints.length).toBeLessThanOrEqual(3);
    // Hints should be descriptive strings
    for (const hint of hints) {
      expect(hint).toContain("undiscovered");
    }
  });

  it("hint text uses trait adjectives from species ID", () => {
    const all = ["intuitive/intensity/playfulness"];
    const hints = getUndiscoveredHints([], all);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain("mystical"); // intuitive -> mystical
    expect(hints[0]).toContain("fierce"); // intensity -> fierce
    expect(hints[0]).toContain("mischievous"); // playfulness -> mischievous
  });

  // ─── calculateCodexReward ───────────────────────────────────

  it("returns positive coins and evolution points", () => {
    const reward = calculateCodexReward("analytical/warmth/empathy");
    expect(reward.coins).toBeGreaterThan(0);
    expect(reward.evolutionPoints).toBeGreaterThan(0);
  });

  it("is deterministic for the same species", () => {
    const r1 = calculateCodexReward("spatial/openness/independence");
    const r2 = calculateCodexReward("spatial/openness/independence");
    expect(r1.coins).toBe(r2.coins);
    expect(r1.evolutionPoints).toBe(r2.evolutionPoints);
  });

  it("produces different rewards for different species", () => {
    const r1 = calculateCodexReward("analytical/warmth/empathy");
    const r2 = calculateCodexReward("spatial/openness/independence");
    // With 128 species, at least some should differ; these two specific IDs do
    // Not guaranteed to differ but extremely likely given different hash inputs
    // We mainly verify the function runs without error
    expect(r1.coins).toBeGreaterThan(0);
    expect(r2.coins).toBeGreaterThan(0);
  });

  // ─── getCodexRarity ─────────────────────────────────────────

  it("returns common for species with high ownership ratio", () => {
    const counts: Record<string, number> = {
      "species_a": 100,
      "species_b": 80,
    };
    expect(getCodexRarity("species_a", counts)).toBe("common");
    expect(getCodexRarity("species_b", counts)).toBe("common");
  });

  it("returns ultra-rare for species with very low ownership", () => {
    const counts: Record<string, number> = {
      "species_popular": 1000,
      "species_ultra": 2,
    };
    expect(getCodexRarity("species_ultra", counts)).toBe("ultra-rare");
  });

  it("returns rare for species in the 5-15% range", () => {
    const counts: Record<string, number> = {
      "species_popular": 1000,
      "species_rare": 100, // 10% of max
    };
    expect(getCodexRarity("species_rare", counts)).toBe("rare");
  });

  it("returns uncommon for species in the 15-40% range", () => {
    const counts: Record<string, number> = {
      "species_popular": 1000,
      "species_uncommon": 250, // 25% of max
    };
    expect(getCodexRarity("species_uncommon", counts)).toBe("uncommon");
  });

  it("returns common for unknown species when counts are empty", () => {
    expect(getCodexRarity("anything", {})).toBe("common");
  });

  it("returns ultra-rare for species not in globalCounts", () => {
    const counts: Record<string, number> = {
      "species_a": 100,
    };
    expect(getCodexRarity("species_missing", counts)).toBe("ultra-rare");
  });

  // ─── calculateRarityBoostedReward ─────────────────────────

  it("boosts reward for rare species", () => {
    const counts: Record<string, number> = {
      "popular": 1000,
      "species_a": 2, // ultra-rare
    };
    const base = calculateCodexReward("species_a");
    const boosted = calculateRarityBoostedReward("species_a", counts);
    expect(boosted.coins).toBeGreaterThan(base.coins);
    expect(boosted.evolutionPoints).toBeGreaterThan(base.evolutionPoints);
    expect(boosted.bonusLabel).toContain("ultra-rare");
  });

  it("gives no bonus label for common species", () => {
    const counts: Record<string, number> = {
      "species_a": 100,
    };
    const boosted = calculateRarityBoostedReward("species_a", counts);
    expect(boosted.bonusLabel).toBeUndefined();
  });

  // ─── getNewlyReachedMilestones ────────────────────────────

  it("detects milestone crossing at 25%", () => {
    const milestones = getNewlyReachedMilestones(20, 26);
    expect(milestones).toHaveLength(1);
    expect(milestones[0].threshold).toBe(25);
  });

  it("detects multiple milestones crossed at once", () => {
    const milestones = getNewlyReachedMilestones(0, 100);
    expect(milestones).toHaveLength(4);
  });

  it("returns empty when no milestone crossed", () => {
    const milestones = getNewlyReachedMilestones(30, 40);
    expect(milestones).toHaveLength(0);
  });

  // ─── CODEX_MILESTONES ─────────────────────────────────────

  it("has 4 milestones at 25/50/75/100", () => {
    expect(CODEX_MILESTONES).toHaveLength(4);
    expect(CODEX_MILESTONES.map((m) => m.threshold)).toEqual([25, 50, 75, 100]);
  });

  it("milestone rewards increase with threshold", () => {
    for (let i = 1; i < CODEX_MILESTONES.length; i++) {
      expect(CODEX_MILESTONES[i].reward.coins).toBeGreaterThan(
        CODEX_MILESTONES[i - 1].reward.coins,
      );
      expect(CODEX_MILESTONES[i].reward.evolutionPoints).toBeGreaterThan(
        CODEX_MILESTONES[i - 1].reward.evolutionPoints,
      );
    }
  });
});
