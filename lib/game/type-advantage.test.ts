import { describe, expect, it } from "vitest";
import {
  getDominantType,
  calculateTypeAdvantage,
  getTypeLabel,
  getTypeChart,
} from "./type-advantage";
import type { CreatureDNA } from "@/lib/genome/dna";

const makeDNA = (overrides: Partial<CreatureDNA>): CreatureDNA => ({
  analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
  warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
  assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
  curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
    bodyShape: 0.5, limbLength: 0.5, headRatio: 0.5, bodyDensity: 0.5,
    furDensity: 0.5, patternComplexity: 0.5, transparency: 0.5, shininess: 0.5,
    eyeSize: 0.5, mouthExpressiveness: 0.5, blushIntensity: 0.5, glowReactivity: 0.5,
    locomotionStyle: 0.5, voiceTimbre: 0.5, socialDistance: 0.5, elementalAffinity: 0.5,
  ...overrides,
});

describe("type-advantage", () => {
  it("getDominantType returns analytical for high cognitive DNA", () => {
    const dna = makeDNA({ analytical: 0.9, intuitive: 0.9, verbal: 0.9, spatial: 0.9 });
    expect(getDominantType(dna)).toBe("analytical");
  });

  it("getDominantType returns emotional for high emotional DNA", () => {
    const dna = makeDNA({ warmth: 0.9, intensity: 0.9, stability: 0.9, openness: 0.9 });
    expect(getDominantType(dna)).toBe("emotional");
  });

  it("getDominantType returns social for high social DNA", () => {
    const dna = makeDNA({ assertiveness: 0.9, empathy: 0.9, playfulness: 0.9, independence: 0.9 });
    expect(getDominantType(dna)).toBe("social");
  });

  it("getDominantType returns creative for high meta DNA", () => {
    const dna = makeDNA({ curiosity: 0.9, persistence: 0.9, adaptability: 0.9, creativity: 0.9 });
    expect(getDominantType(dna)).toBe("creative");
  });

  it("getDominantType returns balanced for even DNA", () => {
    const dna = makeDNA({}); // All 0.5
    expect(getDominantType(dna)).toBe("balanced");
  });

  it("analytical has advantage over creative", () => {
    const analytical = makeDNA({ analytical: 0.9, intuitive: 0.9, verbal: 0.9, spatial: 0.9 });
    const creative = makeDNA({ curiosity: 0.9, persistence: 0.9, adaptability: 0.9, creativity: 0.9 });
    const result = calculateTypeAdvantage(analytical, creative);
    expect(result.multiplier).toBeGreaterThan(1.0);
    expect(result.attackerType).toBe("analytical");
    expect(result.defenderType).toBe("creative");
  });

  it("emotional has advantage over analytical", () => {
    const emotional = makeDNA({ warmth: 0.9, intensity: 0.9, stability: 0.9, openness: 0.9 });
    const analytical = makeDNA({ analytical: 0.9, intuitive: 0.9, verbal: 0.9, spatial: 0.9 });
    const result = calculateTypeAdvantage(emotional, analytical);
    expect(result.multiplier).toBeGreaterThan(1.0);
  });

  it("creative has advantage over social", () => {
    const creative = makeDNA({ curiosity: 0.9, persistence: 0.9, adaptability: 0.9, creativity: 0.9 });
    const social = makeDNA({ assertiveness: 0.9, empathy: 0.9, playfulness: 0.9, independence: 0.9 });
    const result = calculateTypeAdvantage(creative, social);
    expect(result.multiplier).toBeGreaterThan(1.0);
  });

  it("social has advantage over emotional", () => {
    const social = makeDNA({ assertiveness: 0.9, empathy: 0.9, playfulness: 0.9, independence: 0.9 });
    const emotional = makeDNA({ warmth: 0.9, intensity: 0.9, stability: 0.9, openness: 0.9 });
    const result = calculateTypeAdvantage(social, emotional);
    expect(result.multiplier).toBeGreaterThan(1.0);
  });

  it("reversed matchup gives disadvantage", () => {
    const creative = makeDNA({ curiosity: 0.9, persistence: 0.9, adaptability: 0.9, creativity: 0.9 });
    const analytical = makeDNA({ analytical: 0.9, intuitive: 0.9, verbal: 0.9, spatial: 0.9 });
    const result = calculateTypeAdvantage(creative, analytical);
    expect(result.multiplier).toBeLessThan(1.0);
  });

  it("balanced vs anything is neutral", () => {
    const balanced = makeDNA({});
    const analytical = makeDNA({ analytical: 0.9, intuitive: 0.9, verbal: 0.9, spatial: 0.9 });
    const result = calculateTypeAdvantage(balanced, analytical);
    expect(result.multiplier).toBeCloseTo(1.0, 1);
  });

  it("getTypeLabel returns valid info for all types", () => {
    const types = ["analytical", "emotional", "social", "creative", "balanced"] as const;
    for (const t of types) {
      const label = getTypeLabel(t);
      expect(label.ko).toBeTruthy();
      expect(label.en).toBeTruthy();
      expect(label.color).toMatch(/^#/);
      expect(label.icon).toBeTruthy();
    }
  });

  it("getTypeChart returns complete matrix", () => {
    const chart = getTypeChart();
    // 4 types × 4 types = 16 entries
    expect(chart).toHaveLength(16);
    const strong = chart.filter((c) => c.result === "strong");
    const weak = chart.filter((c) => c.result === "weak");
    expect(strong.length).toBe(4); // 4 advantages
    expect(weak.length).toBe(4); // 4 weaknesses
  });

  it("axis bonus adds fine-grained advantage", () => {
    // High analytical attacker vs low stability defender = bonus
    const attacker = makeDNA({ analytical: 0.9, intuitive: 0.9, verbal: 0.9, spatial: 0.9 });
    const defender = makeDNA({ stability: 0.2, curiosity: 0.9, persistence: 0.9, adaptability: 0.9, creativity: 0.9 });
    const result = calculateTypeAdvantage(attacker, defender);
    // Should be > 1.5 base + axis bonus
    expect(result.multiplier).toBeGreaterThan(1.5);
  });
});
