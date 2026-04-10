import { describe, expect, it } from "vitest";
import { getEmotionSound, shouldPlayEmotionSound } from "./emotion-sounds";

describe("Emotion Sound System", () => {
  it("returns sound params for known moods", () => {
    const joyful = getEmotionSound("joyful");
    expect(joyful).not.toBeNull();
    expect(joyful!.frequency).toBeGreaterThan(0);
    expect(joyful!.waveform).toBe("sine");
  });

  it("returns null for unknown moods", () => {
    expect(getEmotionSound("unknown_mood")).toBeNull();
    expect(getEmotionSound(null)).toBeNull();
    expect(getEmotionSound(undefined)).toBeNull();
    expect(getEmotionSound("")).toBeNull();
  });

  it("has distinct sound profiles for different moods", () => {
    const joyful = getEmotionSound("joyful");
    const sad = getEmotionSound("sad");
    expect(joyful!.frequency).not.toBe(sad!.frequency);
    expect(joyful!.duration).not.toBe(sad!.duration);
  });

  it("sad sounds are lower frequency than joyful", () => {
    const joyful = getEmotionSound("joyful")!;
    const sad = getEmotionSound("sad")!;
    expect(sad.frequency).toBeLessThan(joyful.frequency);
  });

  it("should not replay same mood within cooldown", () => {
    // Reset internal state
    const first = shouldPlayEmotionSound("joyful");
    expect(first).toBe(true);
    const second = shouldPlayEmotionSound("joyful");
    expect(second).toBe(false); // Same mood within 10s
  });

  it("should play for different mood", () => {
    shouldPlayEmotionSound("sad"); // Reset to "sad"
    const result = shouldPlayEmotionSound("excited");
    expect(result).toBe(true); // Different mood
  });

  it("should not play for null/undefined moods", () => {
    expect(shouldPlayEmotionSound(null)).toBe(false);
    expect(shouldPlayEmotionSound(undefined)).toBe(false);
  });
});
