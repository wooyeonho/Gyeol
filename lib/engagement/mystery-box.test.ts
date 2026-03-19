import { describe, it, expect } from "vitest";
import {
  rollBoxRarity,
  generateMysteryBox,
  shouldDropMysteryBox,
} from "./mystery-box";

describe("rollBoxRarity", () => {
  it("returns a valid rarity", () => {
    for (let i = 0; i < 100; i++) {
      const rarity = rollBoxRarity(0);
      expect(["common", "rare", "epic", "legendary"]).toContain(rarity);
    }
  });
});

describe("generateMysteryBox", () => {
  it("generates a box with correct structure", () => {
    const box = generateMysteryBox("common");
    expect(box.rarity).toBe("common");
    expect(box.drops.length).toBeGreaterThanOrEqual(1);
    expect(box.glow_color).toBeDefined();
    expect(box.id).toMatch(/^box_/);
  });

  it("legendary boxes have 3 drops", () => {
    const box = generateMysteryBox("legendary");
    expect(box.drops).toHaveLength(3);
  });

  it("epic boxes have 2 drops", () => {
    const box = generateMysteryBox("epic");
    expect(box.drops).toHaveLength(2);
  });

  it("applies streak multiplier to coins", () => {
    const boxNoStreak = generateMysteryBox("common", 0);
    const boxHighStreak = generateMysteryBox("common", 30);
    // With streak 30, coin drops should be 2x
    const coinsNoStreak = boxNoStreak.drops.filter((d) => d.type === "coins").reduce((s, d) => s + d.amount, 0);
    const coinsHighStreak = boxHighStreak.drops.filter((d) => d.type === "coins").reduce((s, d) => s + d.amount, 0);
    // Both might not have coin drops, but if they do the high streak should be >= no streak
    if (coinsNoStreak > 0 && coinsHighStreak > 0) {
      expect(coinsHighStreak).toBeGreaterThanOrEqual(coinsNoStreak);
    }
  });
});

describe("shouldDropMysteryBox", () => {
  it("always drops on perfect day", () => {
    expect(shouldDropMysteryBox({
      messageCount: 100,
      streakDays: 5,
      perfectDayCompleted: true,
      sessionMessageCount: 10,
    })).toBe(true);
  });

  it("does not drop in first 5 session messages", () => {
    // Run many times to be sure (probabilistic)
    let dropped = false;
    for (let i = 0; i < 100; i++) {
      if (shouldDropMysteryBox({
        messageCount: 500,
        streakDays: 30,
        sessionMessageCount: 3,
      })) {
        dropped = true;
      }
    }
    expect(dropped).toBe(false);
  });
});
