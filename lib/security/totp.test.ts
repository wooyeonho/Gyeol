import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  computeTotp,
  verifyTotp,
  buildOtpAuthUri,
} from "./totp";

// Node 20+ exposes `crypto.subtle` globally, so these tests run in the
// default vitest environment without any polyfill.

describe("totp", () => {
  it("generates a 32-char base32 secret", () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
  });

  it("generates stable codes for a fixed timestamp", async () => {
    const secret = "JBSWY3DPEHPK3PXP"; // RFC 6238 test-ish secret
    const ts = 59_000;
    const code = await computeTotp(secret, { timestamp: ts });
    expect(code).toHaveLength(6);
    const second = await computeTotp(secret, { timestamp: ts });
    expect(second).toBe(code);
  });

  it("rotates codes across periods", async () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const a = await computeTotp(secret, { timestamp: now });
    const b = await computeTotp(secret, { timestamp: now + 31_000 });
    expect(a).not.toBe(b);
  });

  it("verifies the current code successfully", async () => {
    const secret = generateTotpSecret();
    const code = await computeTotp(secret);
    expect(await verifyTotp(secret, code)).toBe(true);
  });

  it("rejects obviously wrong codes", async () => {
    const secret = generateTotpSecret();
    expect(await verifyTotp(secret, "000000")).toBe(false);
    expect(await verifyTotp(secret, "abc")).toBe(false);
  });

  it("tolerates ±1 period drift within the verification window", async () => {
    const secret = generateTotpSecret();
    const past = await computeTotp(secret, { timestamp: Date.now() - 25_000 });
    expect(await verifyTotp(secret, past)).toBe(true);
  });

  it("builds a valid otpauth URI", () => {
    const uri = buildOtpAuthUri({
      issuer: "Gyeol",
      account: "test@example.com",
      secret: "JBSWY3DPEHPK3PXP",
    });
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("issuer=Gyeol");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
  });
});
