import { describe, it, expect } from "vitest";
import { deriveEmotionMood, getEmotionSoundProfile } from "./emotion-map";

describe("deriveEmotionMood", () => {
  it("returns melancholy for negative tone + low vitality", () => {
    expect(deriveEmotionMood(0.3, 0.5, "negative")).toBe("melancholy");
  });

  it("returns joyful for positive tone + high vitality", () => {
    expect(deriveEmotionMood(0.8, 0.5, "positive")).toBe("joyful");
  });

  it("returns energetic for high vitality + high trust", () => {
    expect(deriveEmotionMood(0.9, 0.8, null)).toBe("energetic");
  });

  it("returns curious for moderate-high trust + moderate vitality", () => {
    expect(deriveEmotionMood(0.6, 0.7, null)).toBe("curious");
  });

  it("returns reflective for very low vitality", () => {
    expect(deriveEmotionMood(0.2, 0.3, null)).toBe("reflective");
  });

  it("returns calm as default", () => {
    expect(deriveEmotionMood(0.5, 0.4, "neutral")).toBe("calm");
    expect(deriveEmotionMood(0.5, 0.4, null)).toBe("calm");
    expect(deriveEmotionMood(0.5, 0.4)).toBe("calm");
  });

  it("handles boundary values for joyful check", () => {
    // positive + vitality exactly 0.7 — not > 0.7, so not joyful
    expect(deriveEmotionMood(0.7, 0.5, "positive")).not.toBe("joyful");
    expect(deriveEmotionMood(0.71, 0.5, "positive")).toBe("joyful");
  });
});

describe("getEmotionSoundProfile", () => {
  const moods = ["calm", "curious", "joyful", "melancholy", "energetic", "reflective"] as const;

  for (const mood of moods) {
    it(`returns valid profile for ${mood}`, () => {
      const profile = getEmotionSoundProfile(mood);
      expect(profile.mood).toBe(mood);
      expect(profile.base_note).toBeTruthy();
      expect(profile.tempo).toBeGreaterThan(0);
      expect(profile.instruments.length).toBeGreaterThan(0);
      expect(profile.scale.length).toBeGreaterThan(0);
    });
  }

  it("calm has slow tempo", () => {
    expect(getEmotionSoundProfile("calm").tempo).toBe(60);
  });

  it("energetic has fast tempo", () => {
    expect(getEmotionSoundProfile("energetic").tempo).toBe(120);
  });
});
