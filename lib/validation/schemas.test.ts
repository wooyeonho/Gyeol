import { describe, expect, it } from "vitest";
import {
  redeemBodySchema,
  socialPostBodySchema,
  settingsPatchBodySchema,
  seedDnaBodySchema,
  inviteApplyBodySchema,
  socialReactionBodySchema,
} from "./schemas";

describe("Zod Validation Schemas", () => {
  describe("redeemBodySchema", () => {
    it("accepts valid redeem body", () => {
      expect(redeemBodySchema.safeParse({ coins: 500 }).success).toBe(true);
    });

    it("rejects coins below minimum", () => {
      expect(redeemBodySchema.safeParse({ coins: 50 }).success).toBe(false);
    });

    it("rejects coins above maximum", () => {
      expect(redeemBodySchema.safeParse({ coins: 2_000_000 }).success).toBe(false);
    });

    it("rejects non-integer coins", () => {
      expect(redeemBodySchema.safeParse({ coins: 100.5 }).success).toBe(false);
    });

    it("rejects missing coins", () => {
      expect(redeemBodySchema.safeParse({}).success).toBe(false);
    });
  });

  describe("socialPostBodySchema", () => {
    it("accepts valid post", () => {
      const result = socialPostBodySchema.safeParse({ content: "Hello world" });
      expect(result.success).toBe(true);
    });

    it("rejects empty content", () => {
      expect(socialPostBodySchema.safeParse({ content: "" }).success).toBe(false);
    });

    it("rejects too-long content (> 5000 chars)", () => {
      const result = socialPostBodySchema.safeParse({ content: "x".repeat(5001) });
      expect(result.success).toBe(false);
    });
  });

  describe("settingsPatchBodySchema", () => {
    it("accepts valid settings", () => {
      const result = settingsPatchBodySchema.safeParse({
        autonomous_enabled: true,
        dream_enabled: false,
      });
      expect(result.success).toBe(true);
    });

    it("rejects unknown fields (strict mode)", () => {
      const result = settingsPatchBodySchema.safeParse({
        autonomous_enabled: true,
        malicious_field: "exploit",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("seedDnaBodySchema", () => {
    it("accepts valid DNA", () => {
      const result = seedDnaBodySchema.safeParse({
        dna: { warmth: 0.5, analytical: 0.7 },
      });
      expect(result.success).toBe(true);
    });

    it("rejects DNA values out of range", () => {
      const result = seedDnaBodySchema.safeParse({
        dna: { warmth: 2.0 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("inviteApplyBodySchema", () => {
    it("trims and lowercases code", () => {
      const result = inviteApplyBodySchema.safeParse({ code: "  ABC123  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe("abc123");
      }
    });

    it("rejects empty code", () => {
      expect(inviteApplyBodySchema.safeParse({ code: "" }).success).toBe(false);
    });
  });

  describe("socialReactionBodySchema", () => {
    it("accepts valid emoji", () => {
      expect(socialReactionBodySchema.safeParse({ emoji: "❤️" }).success).toBe(true);
    });

    it("rejects empty emoji", () => {
      expect(socialReactionBodySchema.safeParse({ emoji: "" }).success).toBe(false);
    });

    it("rejects too-long emoji string", () => {
      expect(socialReactionBodySchema.safeParse({ emoji: "x".repeat(20) }).success).toBe(false);
    });
  });
});
