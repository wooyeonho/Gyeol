import { describe, expect, it } from "vitest";
import {
  allowedUnderLockdown,
  anonymousAccountNumber,
  assertKdfParamsStrong,
  auditAccount,
  computeRiskScore,
  createPrivacyBudget,
  decideStepUp,
  failClosed,
  KDF_DEFAULTS,
  LOCKDOWN_OFF,
  LOCKDOWN_STRICT,
  lockdownFor,
  requiredPermissions,
  secureHeaderBundle,
  securityScore,
  spendPrivacyBudget,
} from "./world-class-defense";

describe("computeRiskScore", () => {
  it("returns 0 for empty context", () => {
    expect(computeRiskScore({ signals: [] })).toBe(0);
  });
  it("is monotonic in signals", () => {
    const a = computeRiskScore({ signals: ["new_device"] });
    const b = computeRiskScore({ signals: ["new_device", "new_country"] });
    expect(b).toBeGreaterThan(a);
  });
  it("caps at 100", () => {
    const r = computeRiskScore({
      signals: [
        "impossible_travel",
        "tor_exit",
        "credential_reuse",
        "rapid_password_reset",
        "failed_mfa_recently",
        "new_device",
        "new_country",
      ],
    });
    expect(r).toBeLessThanOrEqual(100);
  });
  it("rewards satisfied MFA", () => {
    const a = computeRiskScore({ signals: ["new_device", "new_country"], mfaSatisfied: false });
    const b = computeRiskScore({ signals: ["new_device", "new_country"], mfaSatisfied: true });
    expect(b).toBeLessThan(a);
  });
});

describe("decideStepUp", () => {
  it("allows low-sensitivity actions under low risk", () => {
    expect(decideStepUp(10, "low").action).toBe("allow");
  });
  it("steps up medium risk on medium sensitivity", () => {
    const d = decideStepUp(50, "medium");
    expect(d.action).toBe("step_up");
  });
  it("requires passkey for high sensitivity", () => {
    const d = decideStepUp(5, "high");
    expect(d.action).toBe("step_up");
    if (d.action === "step_up") expect(d.method).toBe("passkey");
  });
  it("denies high-sensitivity actions at high risk", () => {
    const d = decideStepUp(90, "high");
    expect(d.action).toBe("deny");
  });
});

describe("KDF defaults", () => {
  it("argon2id default is strong", () => {
    expect(() => assertKdfParamsStrong(KDF_DEFAULTS.argon2id)).not.toThrow();
  });
  it("pbkdf2 default is strong", () => {
    expect(() => assertKdfParamsStrong(KDF_DEFAULTS["pbkdf2-sha256"])).not.toThrow();
  });
  it("rejects weak argon2id", () => {
    expect(() =>
      assertKdfParamsStrong({ algo: "argon2id", memoryKiB: 1024, iterations: 1, saltLen: 16, keyLen: 32 }),
    ).toThrow();
  });
  it("rejects weak pbkdf2", () => {
    expect(() =>
      assertKdfParamsStrong({ algo: "pbkdf2-sha256", iterations: 1000, saltLen: 16, keyLen: 32 }),
    ).toThrow();
  });
});

describe("secureHeaderBundle", () => {
  it("includes HSTS and nosniff", () => {
    const h = secureHeaderBundle();
    expect(h["Strict-Transport-Security"]).toContain("max-age");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
  });
  it("adds Reporting-Endpoints when reportUri is provided", () => {
    const h = secureHeaderBundle({ reportUri: "https://example.com/r" });
    expect(h["Reporting-Endpoints"]).toContain("example.com");
  });
});

describe("failClosed", () => {
  it("allows only on explicit ok", () => {
    expect(failClosed({ ok: true }).allow).toBe(true);
    expect(failClosed({ ok: false }).allow).toBe(false);
    expect(failClosed({ ok: null }).allow).toBe(false);
  });
});

describe("requiredPermissions", () => {
  it("room_3d requires nothing", () => {
    expect(requiredPermissions("room_3d")).toHaveLength(0);
  });
  it("voice_chat requires only microphone", () => {
    expect(requiredPermissions("voice_chat")).toEqual(["microphone"]);
  });
});

describe("auditAccount + securityScore", () => {
  it("empty snapshot produces findings about MFA", () => {
    const findings = auditAccount({
      hasPasskey: false,
      hasTotp: false,
      passwordAgeDays: 30,
      uniquePassword: true,
      emailVerified: true,
      recentFailedLogins: 0,
      exposedInBreach: false,
      sessionsActive: 1,
    });
    expect(findings.some((f) => f.id === "no_second_factor")).toBe(true);
  });
  it("breach exposure is critical and sorted first", () => {
    const findings = auditAccount({
      hasPasskey: true,
      hasTotp: true,
      passwordAgeDays: 30,
      uniquePassword: false,
      emailVerified: true,
      recentFailedLogins: 0,
      exposedInBreach: true,
      sessionsActive: 1,
    });
    expect(findings[0]?.severity).toBe("critical");
  });
  it("score is 100 for a perfectly healthy account", () => {
    const findings = auditAccount({
      hasPasskey: true,
      hasTotp: true,
      passwordAgeDays: 30,
      uniquePassword: true,
      emailVerified: true,
      recentFailedLogins: 0,
      exposedInBreach: false,
      sessionsActive: 2,
    });
    expect(securityScore(findings)).toBe(100);
  });
  it("score drops significantly on critical findings", () => {
    const findings = auditAccount({
      hasPasskey: false,
      hasTotp: false,
      passwordAgeDays: 800,
      uniquePassword: false,
      emailVerified: false,
      recentFailedLogins: 10,
      exposedInBreach: true,
      sessionsActive: 10,
    });
    expect(securityScore(findings)).toBeLessThan(50);
  });
});

describe("lockdown profile (Apple Lockdown Mode)", () => {
  it("off profile allows generative media", () => {
    expect(allowedUnderLockdown(LOCKDOWN_OFF, "generate_image").allow).toBe(true);
    expect(allowedUnderLockdown(LOCKDOWN_OFF, "voice_stream").allow).toBe(true);
  });
  it("strict profile blocks generative media with a reason", () => {
    const d = allowedUnderLockdown(LOCKDOWN_STRICT, "generate_image");
    expect(d.allow).toBe(false);
    expect(d.reason).toContain("Lockdown");
  });
  it("strict profile blocks external shares", () => {
    expect(allowedUnderLockdown(LOCKDOWN_STRICT, "create_share_link").allow).toBe(false);
  });
  it("lockdownFor selects the right profile", () => {
    expect(lockdownFor("off")).toBe(LOCKDOWN_OFF);
    expect(lockdownFor("strict")).toBe(LOCKDOWN_STRICT);
  });
});

describe("privacy budget (Brave)", () => {
  it("allows spending under the cap", () => {
    const b = createPrivacyBudget(10, 0);
    const r = spendPrivacyBudget(b, 5, 0);
    expect(r.allowed).toBe(true);
    expect(r.next.spent).toBe(5);
  });
  it("rejects spending over the cap", () => {
    const b = createPrivacyBudget(10, 0);
    const r = spendPrivacyBudget(b, 11, 0);
    expect(r.allowed).toBe(false);
  });
  it("rolls the window after 24h", () => {
    const b = createPrivacyBudget(10, 0);
    const after = spendPrivacyBudget(b, 9, 0);
    const rolled = spendPrivacyBudget(after.next, 5, 25 * 60 * 60 * 1000);
    expect(rolled.allowed).toBe(true);
    expect(rolled.next.spent).toBe(5);
  });
});

describe("anonymous account number (Mullvad)", () => {
  it("is deterministic for the same seed", () => {
    const seed = new Uint8Array([1, 2, 3, 4, 5]);
    expect(anonymousAccountNumber(seed)).toBe(anonymousAccountNumber(seed));
  });
  it("differs across different seeds", () => {
    const a = anonymousAccountNumber(new Uint8Array([1, 2, 3]));
    const b = anonymousAccountNumber(new Uint8Array([1, 2, 4]));
    expect(a).not.toBe(b);
  });
  it("formats as three 4-digit groups", () => {
    const n = anonymousAccountNumber(new Uint8Array([9, 9, 9]));
    expect(n).toMatch(/^\d{4} \d{4} \d{4}$/);
  });
});
