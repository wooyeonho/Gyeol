import { describe, expect, it } from "vitest";
import { resolveMoodEmoji } from "./creature-mini-status";

describe("resolveMoodEmoji", () => {
  it("returns neutral emoji for null mood", () => {
    expect(resolveMoodEmoji(null)).toBe("\u{1F610}");
  });

  it("returns matching emoji for known mood", () => {
    expect(resolveMoodEmoji("joyful")).toBe("\u{1F60A}");
    expect(resolveMoodEmoji("sad")).toBe("\u{1F622}");
    expect(resolveMoodEmoji("curious")).toBe("\u{1F9D0}");
    expect(resolveMoodEmoji("scared")).toBe("\u{1F630}");
  });

  it("returns neutral emoji for unknown mood", () => {
    expect(resolveMoodEmoji("nonexistent")).toBe("\u{1F610}");
  });

  it("maps all 16 known moods to non-neutral emoji", () => {
    const knownMoods = [
      "joyful", "excited", "playful", "loving",
      "proud", "peaceful", "curious", "dreamy",
      "sad", "melancholy", "lonely", "angry",
      "frustrated", "surprised", "scared", "shy",
    ];
    for (const mood of knownMoods) {
      const emoji = resolveMoodEmoji(mood);
      expect(emoji).not.toBe("\u{1F610}");
      expect(emoji.length).toBeGreaterThan(0);
    }
  });
});
