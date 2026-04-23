import { describe, expect, it } from "vitest";
import {
  generateStickerPack,
  getStickersByRarity,
  getUnlockedStickers,
  getStickerProgress,
  getStickerForMood,
} from "./sticker-system";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DEFAULT_NEW_DNA_AXES } from "@/lib/genome/dna";

const highDNA: CreatureDNA = {
  analytical: 0.9, intuitive: 0.9, verbal: 0.9, spatial: 0.9,
  warmth: 0.9, intensity: 0.9, stability: 0.9, openness: 0.9,
  assertiveness: 0.9, empathy: 0.9, playfulness: 0.95, independence: 0.9,
  curiosity: 0.9, persistence: 0.9, adaptability: 0.9, creativity: 0.9,
  ...DEFAULT_NEW_DNA_AXES,
};

const lowDNA: CreatureDNA = {
  analytical: 0.2, intuitive: 0.2, verbal: 0.2, spatial: 0.2,
  warmth: 0.2, intensity: 0.2, stability: 0.2, openness: 0.2,
  assertiveness: 0.2, empathy: 0.2, playfulness: 0.2, independence: 0.2,
  curiosity: 0.2, persistence: 0.2, adaptability: 0.2, creativity: 0.2,
  ...DEFAULT_NEW_DNA_AXES,
};

const midDNA: CreatureDNA = {
  analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
  warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
  assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
  curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
  ...DEFAULT_NEW_DNA_AXES,
};

describe("sticker-system", () => {
  it("generates sticker pack with correct creature name", () => {
    const pack = generateStickerPack("Spark", midDNA);
    expect(pack.creatureName).toBe("Spark");
    expect(pack.stickers.length).toBeGreaterThan(0);
  });

  it("high DNA unlocks all stickers", () => {
    const pack = generateStickerPack("Max", highDNA);
    expect(pack.totalUnlocked).toBe(pack.stickers.length);
  });

  it("low DNA unlocks no stickers", () => {
    const pack = generateStickerPack("Min", lowDNA);
    expect(pack.totalUnlocked).toBe(0);
  });

  it("mid DNA unlocks common stickers but not epic", () => {
    const pack = generateStickerPack("Mid", midDNA);
    const commons = getStickersByRarity(pack, "common");
    const epics = getStickersByRarity(pack, "epic");
    expect(commons.every((s) => s.unlocked)).toBe(true);
    expect(epics.every((s) => !s.unlocked)).toBe(true);
  });

  it("getStickersByRarity filters correctly", () => {
    const pack = generateStickerPack("Test", highDNA);
    const rares = getStickersByRarity(pack, "rare");
    expect(rares.length).toBeGreaterThan(0);
    expect(rares.every((s) => s.rarity === "rare")).toBe(true);
  });

  it("getUnlockedStickers returns only unlocked", () => {
    const pack = generateStickerPack("Test", midDNA);
    const unlocked = getUnlockedStickers(pack);
    expect(unlocked.every((s) => s.unlocked)).toBe(true);
  });

  it("getStickerProgress calculates correctly", () => {
    const pack = generateStickerPack("Test", highDNA);
    const progress = getStickerProgress(pack);
    expect(progress.percentage).toBe(100);
    expect(progress.unlocked).toBe(progress.total);
  });

  it("getStickerForMood returns matching sticker", () => {
    const pack = generateStickerPack("Test", highDNA);
    const sticker = getStickerForMood(pack, "happy");
    expect(sticker).not.toBeNull();
    expect(sticker!.mood).toBe("happy");
  });

  it("getStickerForMood returns fallback for unknown mood", () => {
    const pack = generateStickerPack("Test", highDNA);
    const sticker = getStickerForMood(pack, "nonexistent_mood_xyz");
    // Should return any unlocked sticker as fallback
    expect(sticker).not.toBeNull();
    expect(sticker!.unlocked).toBe(true);
  });

  it("getStickerForMood returns null when no stickers unlocked", () => {
    const pack = generateStickerPack("Test", lowDNA);
    const sticker = getStickerForMood(pack, "happy");
    expect(sticker).toBeNull();
  });

  it("all stickers have required fields", () => {
    const pack = generateStickerPack("Test", midDNA);
    for (const sticker of pack.stickers) {
      expect(sticker.id).toBeTruthy();
      expect(sticker.emoji).toBeTruthy();
      expect(sticker.label.ko).toBeTruthy();
      expect(sticker.label.en).toBeTruthy();
      expect(sticker.mood).toBeTruthy();
      expect(sticker.dnaAxis).toBeTruthy();
      expect(["common", "rare", "epic"]).toContain(sticker.rarity);
    }
  });
});
