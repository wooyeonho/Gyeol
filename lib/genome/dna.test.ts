import { describe, it, expect } from "vitest";
import {
  generateInitialDNA,
  applySoftMutation,
  dnaDistance,
  getDominantTraits,
  DNA_AXES,
} from "./dna";

describe("CreatureDNA", () => {
  describe("generateInitialDNA", () => {
    it("produces DNA with all 16 axes", () => {
      const dna = generateInitialDNA("test-agent-1");
      for (const axis of DNA_AXES) {
        expect(dna[axis]).toBeGreaterThanOrEqual(0.25);
        expect(dna[axis]).toBeLessThanOrEqual(0.75);
      }
    });

    it("produces different DNA for different agent IDs", () => {
      const dna1 = generateInitialDNA("agent-aaa");
      const dna2 = generateInitialDNA("agent-bbb");
      const dist = dnaDistance(dna1, dna2);
      expect(dist).toBeGreaterThan(0.01);
    });

    it("is deterministic for the same agent ID", () => {
      const dna1 = generateInitialDNA("agent-fixed");
      const dna2 = generateInitialDNA("agent-fixed");
      expect(dna1).toEqual(dna2);
    });
  });

  describe("applySoftMutation", () => {
    it("nudges warmth for emotional messages", () => {
      const dna = generateInitialDNA("test-emo");
      const { dna: mutated, changedAxes } = applySoftMutation(dna, "사랑해 너무 보고싶어");
      expect(mutated.warmth).toBeGreaterThan(dna.warmth);
      expect(changedAxes).toContain("warmth");
    });

    it("nudges analytical for analytical messages", () => {
      const dna = generateInitialDNA("test-ana");
      const { dna: mutated } = applySoftMutation(dna, "왜 이런 결과가 나왔지? 원인을 분석해봐");
      expect(mutated.analytical).toBeGreaterThan(dna.analytical);
    });

    it("nudges creativity for imaginative messages", () => {
      const dna = generateInitialDNA("test-cre");
      const { dna: mutated } = applySoftMutation(dna, "상상해봐 만약 우리가 별이 된다면 어떤 이야기가 될까");
      expect(mutated.creativity).toBeGreaterThan(dna.creativity);
    });

    it("keeps all values within 0..1", () => {
      let dna = generateInitialDNA("test-clamp");
      for (let i = 0; i < 100; i++) {
        const { dna: next } = applySoftMutation(dna, "사랑해 사랑해 사랑해!!!");
        dna = next;
      }
      for (const axis of DNA_AXES) {
        expect(dna[axis]).toBeGreaterThanOrEqual(0);
        expect(dna[axis]).toBeLessThanOrEqual(1);
      }
    });

    it("applies diminishing returns near boundaries", () => {
      const dna = generateInitialDNA("test-dim");
      dna.warmth = 0.95; // Near max
      const { dna: mutated } = applySoftMutation(dna, "사랑해!");
      // The nudge should be very small since we're near 1.0
      expect(mutated.warmth - dna.warmth).toBeLessThan(0.005);
    });
  });

  describe("dnaDistance", () => {
    it("returns 0 for identical DNA", () => {
      const dna = generateInitialDNA("same");
      expect(dnaDistance(dna, dna)).toBe(0);
    });

    it("returns positive for different DNA", () => {
      const dna1 = generateInitialDNA("a");
      const dna2 = generateInitialDNA("b");
      expect(dnaDistance(dna1, dna2)).toBeGreaterThan(0);
    });
  });

  describe("getDominantTraits", () => {
    it("returns the top N highest axes", () => {
      const dna = generateInitialDNA("dom-test");
      const top = getDominantTraits(dna, 3);
      expect(top).toHaveLength(3);
      // The first should have the highest value
      expect(dna[top[0]]).toBeGreaterThanOrEqual(dna[top[1]]);
      expect(dna[top[1]]).toBeGreaterThanOrEqual(dna[top[2]]);
    });
  });
});
