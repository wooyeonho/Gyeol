import { describe, expect, it } from "vitest";
import {
  calculateStats,
  getTotalPower,
  getStatGrade,
  compareStats,
  getStatExtremes,
  STAT_CONFIG,
} from "./stat-system";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DEFAULT_NEW_DNA_AXES } from "@/lib/genome/dna";

const makeDNA = (overrides: Partial<CreatureDNA>): CreatureDNA => ({
  analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
  warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
  assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
  curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
  ...DEFAULT_NEW_DNA_AXES,
  ...overrides,
});

describe("stat-system", () => {
  it("calculates stats from balanced DNA", () => {
    const stats = calculateStats(makeDNA({}));
    // All axes at 0.5 → weighted sum ~0.5 → stat ~55
    expect(stats.hp).toBeGreaterThan(40);
    expect(stats.hp).toBeLessThan(70);
    expect(stats.atk).toBeGreaterThan(40);
    expect(stats.def).toBeGreaterThan(40);
  });

  it("high warmth/stability/persistence → high HP", () => {
    const tankDNA = makeDNA({ warmth: 0.95, stability: 0.95, persistence: 0.95 });
    const stats = calculateStats(tankDNA);
    expect(stats.hp).toBeGreaterThan(85);
  });

  it("high intensity/assertiveness/analytical → high ATK", () => {
    const attackDNA = makeDNA({ intensity: 0.95, assertiveness: 0.95, analytical: 0.95 });
    const stats = calculateStats(attackDNA);
    expect(stats.atk).toBeGreaterThan(85);
  });

  it("level scaling increases stats", () => {
    const dna = makeDNA({});
    const level1 = calculateStats(dna, 1);
    const level10 = calculateStats(dna, 10);
    // Level 10: 1 + (10-1)*0.02 = 1.18
    expect(level10.hp).toBeGreaterThan(level1.hp);
    expect(level10.atk).toBeGreaterThan(level1.atk);
  });

  it("low vitality reduces stats", () => {
    const dna = makeDNA({});
    const fullVitality = calculateStats(dna, 1, 1.0);
    const lowVitality = calculateStats(dna, 1, 0.0);
    // At 0 vitality, stats = 60% of base
    expect(lowVitality.hp).toBeLessThan(fullVitality.hp);
    expect(lowVitality.hp).toBeGreaterThan(fullVitality.hp * 0.5);
  });

  it("getTotalPower sums all stats", () => {
    const stats = calculateStats(makeDNA({}));
    const total = getTotalPower(stats);
    expect(total).toBe(stats.hp + stats.atk + stats.def + stats.spd + stats.wis + stats.cha);
  });

  it("getStatGrade returns correct grades", () => {
    expect(getStatGrade(95).grade).toBe("S");
    expect(getStatGrade(80).grade).toBe("A");
    expect(getStatGrade(65).grade).toBe("B");
    expect(getStatGrade(50).grade).toBe("C");
    expect(getStatGrade(35).grade).toBe("D");
    expect(getStatGrade(20).grade).toBe("F");
  });

  it("compareStats shows difference", () => {
    const strong = calculateStats(makeDNA({ warmth: 0.9, stability: 0.9, persistence: 0.9 }));
    const weak = calculateStats(makeDNA({ warmth: 0.1, stability: 0.1, persistence: 0.1 }));
    const diff = compareStats(strong, weak);
    expect(diff.hp).toBeGreaterThan(0);
  });

  it("getStatExtremes finds strongest and weakest", () => {
    const dna = makeDNA({ intensity: 0.95, assertiveness: 0.95, analytical: 0.95, warmth: 0.1, stability: 0.1, persistence: 0.1 });
    const stats = calculateStats(dna);
    const { strongest, weakest } = getStatExtremes(stats);
    expect(strongest).toBe("atk");
    expect(weakest).toBe("hp");
  });

  it("all stat configs have valid properties", () => {
     

    for (const [_key, config] of Object.entries(STAT_CONFIG)) {
      expect(config.label.ko).toBeTruthy();
      expect(config.label.en).toBeTruthy();
      expect(config.color).toMatch(/^#/);
      expect(config.icon).toBeTruthy();
      expect(config.axes.length).toBe(config.weights.length);
      const weightSum = config.weights.reduce((a, b) => a + b, 0);
      expect(weightSum).toBeCloseTo(1.0, 1);
    }
  });
});
