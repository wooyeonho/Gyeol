import { describe, expect, it } from "vitest";
import { moodToEmotionTone } from "./mood-to-tone";

describe("moodToEmotionTone", () => {
  it("defaults to calm for null / undefined", () => {
    expect(moodToEmotionTone(null)).toBe("calm");
    expect(moodToEmotionTone(undefined)).toBe("calm");
    expect(moodToEmotionTone("")).toBe("calm");
  });
  it("maps known English moods", () => {
    expect(moodToEmotionTone("happy")).toBe("joyful");
    expect(moodToEmotionTone("sad")).toBe("melancholic");
    expect(moodToEmotionTone("curious")).toBe("curious");
    expect(moodToEmotionTone("tender")).toBe("tender");
    expect(moodToEmotionTone("terrified")).toBe("anxious");
  });
  it("is case-insensitive and trims whitespace", () => {
    expect(moodToEmotionTone("  HAPPY  ")).toBe("joyful");
    expect(moodToEmotionTone("Curious")).toBe("curious");
  });
  it("falls back to calm for unknown moods", () => {
    expect(moodToEmotionTone("frazzle")).toBe("calm");
  });
});
