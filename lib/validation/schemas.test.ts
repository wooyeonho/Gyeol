import { describe, expect, it } from "vitest";
import {
  redeemBodySchema,
  socialPostBodySchema,
  settingsPatchBodySchema,
  seedDnaBodySchema,
  inviteApplyBodySchema,
  socialReactionBodySchema,
  careBodySchema,
  dnaEditBodySchema,
  timeTravelBodySchema,
  socialGiftBodySchema,
  parseBody,
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

  /* ═══════════════════════════════════════════
   * Security-focused validation tests
   * ═══════════════════════════════════════════ */

  describe("careBodySchema — security", () => {
    it("rejects SQL injection in agentId", () => {
      expect(careBodySchema.safeParse({ agentId: "'; DROP TABLE agents; --", action: "feed" }).success).toBe(false);
    });

    it("rejects XSS in agentId", () => {
      expect(careBodySchema.safeParse({ agentId: '<script>alert(1)</script>', action: "feed" }).success).toBe(false);
    });

    it("rejects non-enum action values", () => {
      expect(careBodySchema.safeParse({ agentId: "00000000-0000-4000-8000-000000000001", action: "delete" }).success).toBe(false);
    });
  });

  describe("dnaEditBodySchema — security", () => {
    it("rejects out-of-range DNA values (>1)", () => {
      expect(dnaEditBodySchema.safeParse({
        agentId: "00000000-0000-4000-8000-000000000001",
        edits: { analytical: 999 },
      }).success).toBe(false);
    });

    it("rejects negative DNA values", () => {
      expect(dnaEditBodySchema.safeParse({
        agentId: "00000000-0000-4000-8000-000000000001",
        edits: { warmth: -1 },
      }).success).toBe(false);
    });
  });

  describe("timeTravelBodySchema — security", () => {
    it("rejects empty message", () => {
      expect(timeTravelBodySchema.safeParse({ target_date: "2025-01-15", message: "" }).success).toBe(false);
    });

    it("rejects message over 2000 chars", () => {
      expect(timeTravelBodySchema.safeParse({ target_date: "2025-01-15", message: "x".repeat(2001) }).success).toBe(false);
    });

    it("rejects invalid date string", () => {
      expect(timeTravelBodySchema.safeParse({ target_date: "not-a-date", message: "test" }).success).toBe(false);
    });
  });

  describe("socialGiftBodySchema — security", () => {
    it("rejects negative coins (theft attempt)", () => {
      expect(socialGiftBodySchema.safeParse({
        target_agent_id: "00000000-0000-4000-8000-000000000001", coins: -100,
      }).success).toBe(false);
    });

    it("rejects zero coins", () => {
      expect(socialGiftBodySchema.safeParse({
        target_agent_id: "00000000-0000-4000-8000-000000000001", coins: 0,
      }).success).toBe(false);
    });

    it("rejects coins over limit", () => {
      expect(socialGiftBodySchema.safeParse({
        target_agent_id: "00000000-0000-4000-8000-000000000001", coins: 99999,
      }).success).toBe(false);
    });

    it("rejects non-integer coins", () => {
      expect(socialGiftBodySchema.safeParse({
        target_agent_id: "00000000-0000-4000-8000-000000000001", coins: 10.5,
      }).success).toBe(false);
    });
  });

  describe("parseBody — security", () => {
    it("parses valid JSON body", async () => {
      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "00000000-0000-4000-8000-000000000001", action: "feed" }),
      });
      const result = await parseBody(req, careBodySchema);
      expect(result.success).toBe(true);
    });

    it("returns error for invalid JSON", async () => {
      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json{{{",
      });
      const result = await parseBody(req, careBodySchema);
      expect(result.success).toBe(false);
    });

    it("returns error for empty body", async () => {
      const req = new Request("http://localhost/test", {
        method: "POST",
        body: "",
      });
      const result = await parseBody(req, careBodySchema);
      expect(result.success).toBe(false);
    });
  });
});
