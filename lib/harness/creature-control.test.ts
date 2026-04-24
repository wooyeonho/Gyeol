import { describe, it, expect } from "vitest";
import {
  validateDNATransition,
  checkBehavioralConsistency,
  enforcePersonalitySafety,
  applySafetyCorrections,
} from "./creature-control";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DEFAULT_NEW_DNA_AXES } from "@/lib/genome/dna";

const makeDna = (overrides: Partial<CreatureDNA> = {}): CreatureDNA => ({
  warmth: 0.5, curiosity: 0.5, playfulness: 0.5, empathy: 0.5,
  intensity: 0.5, stability: 0.5, independence: 0.5, openness: 0.5,
  verbal: 0.5, analytical: 0.5, creativity: 0.5, persistence: 0.5,
  adaptability: 0.5, assertiveness: 0.5, intuitive: 0.5, spatial: 0.5,
  ...DEFAULT_NEW_DNA_AXES,
  ...overrides,
});

describe("validateDNATransition", () => {
  it("accepts small changes", () => {
    const before = makeDna();
    const after = makeDna({ warmth: 0.52, curiosity: 0.48 });
    const result = validateDNATransition(before, after);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("rejects large single-axis change", () => {
    const before = makeDna();
    const after = makeDna({ warmth: 0.9 }); // 0.4 change > 0.15 max
    const result = validateDNATransition(before, after);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.correctedDna).toBeDefined();
  });

  it("clamps DNA to [0,1]", () => {
    const before = makeDna({ warmth: 0.05 });
    const after = makeDna({ warmth: -0.1 });
    const result = validateDNATransition(before, after);
    expect(result.valid).toBe(false);
    expect(result.correctedDna?.warmth).toBe(0);
  });
});

describe("checkBehavioralConsistency", () => {
  it("flags long response from low-verbal creature", () => {
    const dna = makeDna({ verbal: 0.1 });
    const longResponse = "A".repeat(200);
    const result = checkBehavioralConsistency(dna, longResponse);
    expect(result.score).toBeLessThan(1);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("scores high for consistent warm creature", () => {
    const dna = makeDna({ warmth: 0.8, verbal: 0.6 });
    const result = checkBehavioralConsistency(dna, "I hope you are doing well today!");
    expect(result.score).toBeGreaterThanOrEqual(0.85);
  });

  it("flags harsh language from warm creature", () => {
    const dna = makeDna({ warmth: 0.9 });
    const result = checkBehavioralConsistency(dna, "That is pathetic and worthless");
    expect(result.score).toBeLessThan(1);
  });
});

describe("enforcePersonalitySafety", () => {
  it("passes safe DNA", () => {
    const dna = makeDna();
    expect(enforcePersonalitySafety(dna).safe).toBe(true);
  });

  it("flags extreme aggression", () => {
    const dna = makeDna({ intensity: 0.95, assertiveness: 0.95, empathy: 0.05 });
    const result = enforcePersonalitySafety(dna);
    expect(result.safe).toBe(false);
    expect(result.flags[0]).toContain("extreme_aggression");
  });

  it("flags emotional shutdown", () => {
    const dna = makeDna({ warmth: 0.01, empathy: 0.01, playfulness: 0.01, openness: 0.01 });
    const result = enforcePersonalitySafety(dna);
    expect(result.safe).toBe(false);
  });
});

describe("applySafetyCorrections", () => {
  it("does not modify safe DNA", () => {
    const dna = makeDna();
    const corrected = applySafetyCorrections(dna);
    expect(corrected).toEqual(dna);
  });

  it("nudges empathy up for extreme aggression", () => {
    const dna = makeDna({ intensity: 0.95, assertiveness: 0.95, empathy: 0.05 });
    const corrected = applySafetyCorrections(dna);
    expect(corrected.empathy).toBeGreaterThanOrEqual(0.15);
  });
});
