import { describe, expect, it } from "vitest";
import { deriveStats, STAT_META } from "./stats";
import type { CreatureDNA } from "@/lib/genome/dna";

function makeDNA(overrides: Partial<CreatureDNA> = {}): CreatureDNA {
  return {
    analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
    warmth: 0.5, intensity: 0.5, stability: 0.5, openness: 0.5,
    assertiveness: 0.5, empathy: 0.5, playfulness: 0.5, independence: 0.5,
    curiosity: 0.5, persistence: 0.5, adaptability: 0.5, creativity: 0.5,
    ...overrides,
  };
}

describe("Creature Stats System", () => {
  it("derives all 7 stats + total", () => {
    const stats = deriveStats(makeDNA());
    expect(stats.hp).toBeGreaterThan(0);
    expect(stats.atk).toBeGreaterThan(0);
    expect(stats.def).toBeGreaterThan(0);
    expect(stats.spd).toBeGreaterThan(0);
    expect(stats.int).toBeGreaterThan(0);
    expect(stats.cha).toBeGreaterThan(0);
    expect(stats.luk).toBeGreaterThan(0);
    expect(stats.total).toBe(stats.hp + stats.atk + stats.def + stats.spd + stats.int + stats.cha + stats.luk);
  });

  it("scales with gen level", () => {
    const gen1 = deriveStats(makeDNA(), 1);
    const gen5 = deriveStats(makeDNA(), 5);
    expect(gen5.total).toBeGreaterThan(gen1.total);
  });

  it("reflects DNA specialization", () => {
    const analytical = deriveStats(makeDNA({ analytical: 1.0, curiosity: 1.0, intuitive: 1.0 }));
    const physical = deriveStats(makeDNA({ stability: 1.0, persistence: 1.0, intensity: 1.0 }));

    expect(analytical.int).toBeGreaterThan(physical.int);
    expect(physical.hp).toBeGreaterThan(analytical.hp);
    expect(physical.def).toBeGreaterThan(analytical.def);
  });

  it("produces different stats for different DNA", () => {
    const a = deriveStats(makeDNA({ warmth: 1.0 }));
    const b = deriveStats(makeDNA({ warmth: 0.0 }));
    expect(a.cha).not.toBe(b.cha);
  });

  it("has metadata for all stats", () => {
    const keys = Object.keys(STAT_META);
    expect(keys).toContain("hp");
    expect(keys).toContain("atk");
    expect(keys).toContain("luk");
    expect(keys.length).toBe(7);
  });
});
