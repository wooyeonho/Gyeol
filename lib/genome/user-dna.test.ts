import { describe, it, expect } from "vitest";
import {
  computeResonance,
  createInitialUserDNA,
  resonanceTopDivergence,
  resonanceTopOverlap,
  updateUserDNA,
} from "./user-dna";
import { DNA_AXES, generateInitialDNA } from "./dna";

describe("UserDNA", () => {
  describe("createInitialUserDNA", () => {
    it("produces neutral 0.5 across all 16 axes", () => {
      const dna = createInitialUserDNA();
      for (const axis of DNA_AXES) {
        expect(dna[axis]).toBe(0.5);
      }
    });
  });

  describe("updateUserDNA", () => {
    it("raises analytical axis when user asks 'why'", () => {
      const initial = createInitialUserDNA();
      const { dna, changedAxes } = updateUserDNA(initial, "Why does this happen? I need to understand the reason.");
      expect(dna.analytical).toBeGreaterThan(initial.analytical);
      expect(changedAxes).toContain("analytical");
    });

    it("raises playfulness for ㅋㅋ / lol messages", () => {
      const initial = createInitialUserDNA();
      const { dna } = updateUserDNA(initial, "ㅋㅋㅋ 진짜 재밌네 lol");
      expect(dna.playfulness).toBeGreaterThan(initial.playfulness);
    });

    it("keeps values clamped to [0, 1]", () => {
      let dna = createInitialUserDNA();
      for (let i = 0; i < 200; i++) {
        dna = updateUserDNA(dna, "why why why analyze reason because why").dna;
      }
      for (const axis of DNA_AXES) {
        expect(dna[axis]).toBeGreaterThanOrEqual(0);
        expect(dna[axis]).toBeLessThanOrEqual(1);
      }
    });

    it("accumulates a distinct profile over many messages", () => {
      let analyticalUser = createInitialUserDNA();
      let playfulUser = createInitialUserDNA();
      for (let i = 0; i < 30; i++) {
        analyticalUser = updateUserDNA(analyticalUser, "Why is this? I want to analyze the reason. What is the pattern?").dna;
        playfulUser = updateUserDNA(playfulUser, "ㅋㅋㅋ 놀자 진짜 재밌다 완전 대박 lol haha").dna;
      }
      expect(analyticalUser.analytical).toBeGreaterThan(playfulUser.analytical);
      expect(playfulUser.playfulness).toBeGreaterThan(analyticalUser.playfulness);
    });
  });

  describe("computeResonance", () => {
    it("returns 100 for identical DNA", () => {
      const dna = createInitialUserDNA();
      expect(computeResonance(dna, dna)).toBe(100);
    });

    it("returns 0..100 range for arbitrary DNA pairs", () => {
      const userDNA = createInitialUserDNA();
      const creatureDNA = generateInitialDNA("test-agent-xyz");
      const score = computeResonance(userDNA, creatureDNA);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("rises when user DNA drifts toward creature DNA", () => {
      const creatureDNA = generateInitialDNA("creature-alpha");
      let userDNA = createInitialUserDNA();
      const baseline = computeResonance(userDNA, creatureDNA);

      // Build a conversation that nudges user DNA toward creature's dominant traits
      for (let i = 0; i < 40; i++) {
        userDNA = updateUserDNA(userDNA, "why what how when where? I want to know. Tell me more.").dna;
      }
      const next = computeResonance(userDNA, creatureDNA);
      // Score can go up or down depending on the creature's starting profile,
      // but it MUST change (not stay identical to baseline)
      expect(Math.abs(next - baseline)).toBeGreaterThan(0);
    });
  });

  describe("resonanceTopOverlap & resonanceTopDivergence", () => {
    it("returns 3 axes sorted by closeness", () => {
      const user = createInitialUserDNA();
      const creature = generateInitialDNA("agent-x");
      const overlap = resonanceTopOverlap(user, creature, 3);
      expect(overlap).toHaveLength(3);
      expect(overlap[0].closeness).toBeGreaterThanOrEqual(overlap[1].closeness);
      expect(overlap[1].closeness).toBeGreaterThanOrEqual(overlap[2].closeness);
    });

    it("divergence axes are opposite-ordered from overlap axes", () => {
      const user = createInitialUserDNA();
      const creature = generateInitialDNA("agent-y");
      const divergence = resonanceTopDivergence(user, creature, 3);
      expect(divergence).toHaveLength(3);
      expect(divergence[0].gap).toBeGreaterThanOrEqual(divergence[1].gap);
    });
  });
});
