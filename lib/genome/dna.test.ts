import { describe, it, expect } from "vitest";
import {
  generateInitialDNA,
  applySoftMutation,
  applyDnaShift,
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

  describe("applyDnaShift", () => {
    it("applies positive shift to the correct axis", () => {
      const dna = generateInitialDNA("shift-pos");
      const original = dna.curiosity;
      const { dna: mutated, axis, delta } = applyDnaShift(dna, "dna_shift:curiosity:+0.13");
      expect(axis).toBe("curiosity");
      expect(delta).toBeCloseTo(0.13);
      expect(mutated.curiosity).toBeCloseTo(Math.min(1, original + 0.13));
      // Other axes unchanged
      expect(mutated.warmth).toBe(dna.warmth);
    });

    it("applies negative shift", () => {
      const dna = generateInitialDNA("shift-neg");
      const original = dna.stability;
      const { dna: mutated, axis, delta } = applyDnaShift(dna, "dna_shift:stability:-0.10");
      expect(axis).toBe("stability");
      expect(delta).toBeCloseTo(-0.10);
      expect(mutated.stability).toBeCloseTo(Math.max(0, original - 0.10));
    });

    it("clamps to 0..1 range on overflow", () => {
      const dna = generateInitialDNA("shift-clamp");
      dna.intensity = 0.95;
      const { dna: mutated } = applyDnaShift(dna, "dna_shift:intensity:+0.20");
      expect(mutated.intensity).toBe(1);
    });

    it("clamps to 0..1 range on underflow", () => {
      const dna = generateInitialDNA("shift-clamp-low");
      dna.openness = 0.03;
      const { dna: mutated } = applyDnaShift(dna, "dna_shift:openness:-0.10");
      expect(mutated.openness).toBe(0);
    });

    it("returns original DNA for invalid format", () => {
      const dna = generateInitialDNA("shift-invalid");
      const { dna: mutated, axis, delta } = applyDnaShift(dna, "not_a_shift");
      expect(axis).toBeNull();
      expect(delta).toBe(0);
      expect(mutated).toBe(dna); // Same reference — no mutation
    });

    it("returns original DNA for invalid axis name", () => {
      const dna = generateInitialDNA("shift-bad-axis");
      const { axis } = applyDnaShift(dna, "dna_shift:nonexistent:+0.10");
      expect(axis).toBeNull();
    });

    it("does not mutate the original DNA object", () => {
      const dna = generateInitialDNA("shift-immutable");
      const originalCuriosity = dna.curiosity;
      applyDnaShift(dna, "dna_shift:curiosity:+0.50");
      expect(dna.curiosity).toBe(originalCuriosity);
    });

    it("handles all 16 DNA axes", () => {
      const dna = generateInitialDNA("shift-all-axes");
      for (const axis of DNA_AXES) {
        const { axis: resultAxis } = applyDnaShift(dna, `dna_shift:${axis}:+0.01`);
        expect(resultAxis).toBe(axis);
      }
    });
  });
});
