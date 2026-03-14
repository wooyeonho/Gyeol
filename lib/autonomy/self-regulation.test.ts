import { describe, it, expect } from "vitest";
import {
  similarity,
  isMeaningfulAutonomousOutput,
  isRepetitiveOutput,
  capText,
  buildAutonomyCue,
  computeProactiveChance
} from "./self-regulation";

describe("self-regulation", () => {
  describe("similarity", () => {
    it("should return 1 for identical string", () => {
      expect(similarity("hello world", "hello world")).toBe(1);
    });

    it("should calculate correct Jaccard similarity", () => {
      const sim = similarity("hello beautiful world", "hello dark world");
      // Union: hello, beautiful, world, dark (4 tokens)
      // Intersection: hello, world (2 tokens)
      expect(sim).toBe(0.5);
    });

    it("should handle empty or entirely different strings", () => {
      expect(similarity("hello", "world")).toBe(0);
      expect(similarity("", "")).toBe(0);
    });
  });

  describe("isMeaningfulAutonomousOutput", () => {
    it("should reject strings that are too short", () => {
      expect(isMeaningfulAutonomousOutput("short")).toBe(false);
    });

    it("should reject fallback phrases", () => {
      expect(isMeaningfulAutonomousOutput("저는 지금은 잠시 쉬고 있어요")).toBe(false);
      expect(isMeaningfulAutonomousOutput("조금 후에 다시 말해줘 제발")).toBe(false);
    });

    it("should accept meaningful long strings", () => {
      expect(isMeaningfulAutonomousOutput("This is a sufficiently long and meaningful string.")).toBe(true);
    });
  });

  describe("isRepetitiveOutput", () => {
    it("should identify repetitive output above threshold", () => {
      const text = "I am dreaming of a dark sky";
      const recents = ["I am dreaming of a dark sky right now", "Something else"];
      expect(isRepetitiveOutput(text, recents, 0.7)).toBe(true);
    });

    it("should not trigger on completely different contents", () => {
      const text = "A new original thought";
      const recents = ["Old thought", "Another one"];
      expect(isRepetitiveOutput(text, recents, 0.7)).toBe(false);
    });
  });

  describe("capText", () => {
    it("should not truncate short text", () => {
      expect(capText("Hello", 10)).toBe("Hello");
    });

    it("should truncate and add ellipsis to long text", () => {
      expect(capText("Hello World", 10)).toBe("Hello Wor…");
    });
  });

  describe("buildAutonomyCue", () => {
    it("should generate the correct cue string depending on states", () => {
      const cue = buildAutonomyCue({ hoursSinceUser: 25, vitality: 0.2, subjectiveTime: 10 });
      expect(cue).toContain("성찰이 강해");
      expect(cue).toContain("본질적인 문장");
      expect(cue).toContain("새로운 감각");
    });
  });

  describe("computeProactiveChance", () => {
    it("should compute minimum base chance", () => {
      expect(computeProactiveChance({ hoursSinceUser: 1, vitality: 0.5, intimacy: 10 })).toBe(0.05);
    });

    it("should increase chance based on hours, vitality, and intimacy but cap at 0.35", () => {
      // 0.05 (base) + 0.1 (>2h) + 0.08 (>12h) + 0.04 (>0.7v) + 0.03 (>30i) = 0.30
      expect(computeProactiveChance({ hoursSinceUser: 20, vitality: 0.9, intimacy: 50 })).toBeCloseTo(0.30);
    });
  });
});
