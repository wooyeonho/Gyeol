import { describe, expect, it } from "vitest";
import {
  assertKdfParamsStrong,
  auditAccount,
  computeRiskScore,
  decideStepUp,
  failClosed,
  KDF_DEFAULTS,
  requiredPermissions,
  secureHeaderBundle,
  securityScore,
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
