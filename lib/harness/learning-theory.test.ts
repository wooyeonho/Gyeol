import { describe, it, expect } from "vitest";
import { computePACBound, isEvolutionReliable, estimateVCDimension, analyzeConvergence } from "./learning-theory";
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

describe("computePACBound", () => {
  it("requires more samples for tighter epsilon", () => {
    const loose = computePACBound(100, 0.2, 0.05);
    const tight = computePACBound(100, 0.05, 0.05);
    expect(tight.requiredSamples).toBeGreaterThan(loose.requiredSamples);
  });

  it("returns sufficient=true with enough samples", () => {
    const result = computePACBound(10000, 0.1, 0.05);
    expect(result.sufficient).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("returns sufficient=false with few samples", () => {
    const result = computePACBound(5, 0.1, 0.05);
    expect(result.sufficient).toBe(false);
  });
});

describe("isEvolutionReliable", () => {
  it("returns false for very few messages", () => {
    expect(isEvolutionReliable(3)).toBe(false);
  });

  it("returns true for many messages", () => {
    expect(isEvolutionReliable(5000)).toBe(true);
  });
});

describe("estimateVCDimension", () => {
  it("returns positive VC dimension", () => {
    const { vcDim, sampleComplexity } = estimateVCDimension();
    expect(vcDim).toBeGreaterThan(0);
    expect(sampleComplexity).toBeGreaterThan(vcDim);
  });
});

describe("analyzeConvergence", () => {
  it("returns default for fewer than 3 snapshots", () => {
    const report = analyzeConvergence([
      { dna: makeDna(), messageCount: 1 },
      { dna: makeDna({ warmth: 0.55 }), messageCount: 5 },
    ]);
    expect(report.isConverging).toBe(false);
    expect(report.estimatedConversationsToConverge).toBe(Infinity);
  });

  it("detects convergence when changes decrease", () => {
    const snapshots = [];
    for (let i = 0; i < 10; i++) {
      // Changes get smaller each step
      const delta = 0.1 * Math.exp(-i * 0.3);
      snapshots.push({
        dna: makeDna({ warmth: 0.5 + delta }),
        messageCount: i * 10,
      });
    }
    const report = analyzeConvergence(snapshots);
    expect(report.recentChangeMagnitude).toBeLessThan(0.1);
  });

  it("reports axis stability", () => {
    const snapshots = [
      { dna: makeDna({ warmth: 0.5, curiosity: 0.3 }), messageCount: 0 },
      { dna: makeDna({ warmth: 0.5, curiosity: 0.5 }), messageCount: 10 },
      { dna: makeDna({ warmth: 0.5, curiosity: 0.7 }), messageCount: 20 },
      { dna: makeDna({ warmth: 0.5, curiosity: 0.8 }), messageCount: 30 },
    ];
    const report = analyzeConvergence(snapshots);
    // warmth is stable (no change), curiosity is volatile
    expect(report.axisStability.warmth).toBeGreaterThan(report.axisStability.curiosity ?? 0);
  });
});
