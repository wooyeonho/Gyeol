/**
 * World-class defense playbook — synthesized from 18+ top security products.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md):
 *   Signal, 1Password, Bitwarden, ProtonMail, Apple iCloud Keychain,
 *   Cloudflare, Okta/Auth0, Keeper, Tor/Tails, NordVPN, Google Advanced
 *   Protection, iOS App Store Review (ATT), Tutanota, Mullvad, KeePassXC,
 *   Yubico/FIDO2, Apple Lockdown Mode, Brave Shields.
 *
 * This file is a **defense-in-depth helper layer** — pure functions that any
 * middleware, RLS policy, or API route can call. It intentionally does NOT
 * replace the existing primitives in `lib/security/*` (totp, passkey, csrf,
 * secret-crypto, rate-limit, electric-fence). It adds:
 *
 *   1. Adaptive risk scoring (Okta/Auth0) — rolls up signals into a score.
 *   2. Step-up decision policy (adaptive MFA).
 *   3. Session isolation levels (Tor/Tails inspired).
 *   4. Zero-knowledge client KDF parameters (1Password / Bitwarden).
 *   5. Secure-default header bundle (Cloudflare).
 *   6. Fail-closed predicate (NordVPN kill-switch philosophy).
 *   7. Permission minimization helpers (Apple ATT).
 *   8. Security audit rule catalog (Bitwarden-style Vault Health).
 *
 * All functions are deterministic and side-effect free so they're trivial
 * to unit test.
 */

/* ── 1. Adaptive risk scoring (Okta/Auth0 inspired) ───────────────────── */

export type RiskSignal =
  | "new_device"
  | "new_country"
  | "tor_exit"
  | "datacenter_ip"
  | "impossible_travel"
  | "credential_reuse"
  | "rapid_password_reset"
  | "unknown_user_agent"
  | "failed_mfa_recently"
  | "new_refresh_grant"
  | "privileged_action";

export type RiskContext = {
  signals: readonly RiskSignal[];
  /** 0 = unknown, >0 = session-age-in-ms since last trusted login. */
  sessionAgeMs?: number;
  /** If the user has already completed MFA in this session. */
  mfaSatisfied?: boolean;
};

const SIGNAL_WEIGHTS: Record<RiskSignal, number> = {
  new_device: 15,
  new_country: 25,
  tor_exit: 35,
  datacenter_ip: 20,
  impossible_travel: 60,
  credential_reuse: 50,
  rapid_password_reset: 40,
  unknown_user_agent: 8,
  failed_mfa_recently: 30,
  new_refresh_grant: 10,
  privileged_action: 20,
};

/** Compute a 0-100 risk score, monotonic in the number/severity of signals. */
export function computeRiskScore(ctx: RiskContext): number {
  let raw = 0;
  for (const s of ctx.signals) raw += SIGNAL_WEIGHTS[s] ?? 0;
  // Old sessions decay trust linearly over 12 hours.
  if (ctx.sessionAgeMs && ctx.sessionAgeMs > 0) {
    const hours = ctx.sessionAgeMs / (60 * 60 * 1000);
    raw += Math.min(hours * 1.2, 20);
  }
  // MFA already satisfied reduces risk substantially.
  if (ctx.mfaSatisfied) raw -= 20;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/* ── 2. Step-up decision policy ────────────────────────────────────────── */

export type StepUpDecision =
  | { action: "allow" }
  | { action: "step_up"; method: "totp" | "passkey" | "email_otp" }
  | { action: "deny"; reason: string };

/**
 * Decide whether to allow, step-up, or deny based on risk score and the
 * sensitivity of the action being performed.
 */
export function decideStepUp(score: number, sensitivity: "low" | "medium" | "high"): StepUpDecision {
  if (sensitivity === "low") {
    if (score < 60) return { action: "allow" };
    if (score < 80) return { action: "step_up", method: "totp" };
    return { action: "deny", reason: "Risk exceeds low-sensitivity ceiling" };
  }
  if (sensitivity === "medium") {
    if (score < 30) return { action: "allow" };
    if (score < 70) return { action: "step_up", method: "totp" };
    return { action: "deny", reason: "Risk exceeds medium-sensitivity ceiling" };
  }
  // high
  if (score < 10) return { action: "step_up", method: "passkey" };
  if (score < 40) return { action: "step_up", method: "passkey" };
  return { action: "deny", reason: "High-sensitivity actions require a clean session" };
}

/* ── 3. Session isolation levels (Tor/Tails inspired) ──────────────────── */

export type IsolationLevel = "guest" | "normal" | "elevated" | "vault";

/** Session isolation TTL and cookie flags for a given level. */
export const ISOLATION_POLICY: Record<
  IsolationLevel,
  { ttlMs: number; sameSite: "strict" | "lax"; httpOnly: true; secure: true; partitioned: boolean }
> = {
  guest: { ttlMs: 30 * 60 * 1000, sameSite: "lax", httpOnly: true, secure: true, partitioned: true },
  normal: { ttlMs: 7 * 24 * 60 * 60 * 1000, sameSite: "lax", httpOnly: true, secure: true, partitioned: false },
  elevated: { ttlMs: 60 * 60 * 1000, sameSite: "strict", httpOnly: true, secure: true, partitioned: false },
  vault: { ttlMs: 5 * 60 * 1000, sameSite: "strict", httpOnly: true, secure: true, partitioned: true },
};

/* ── 4. Zero-knowledge client KDF parameters (1Password / Bitwarden) ──── */

export type KdfAlgo = "argon2id" | "pbkdf2-sha256";

export type KdfParams = {
  algo: KdfAlgo;
  /** Argon2: memory in KiB. PBKDF2: ignored. */
  memoryKiB?: number;
  /** Argon2: iterations / PBKDF2: iterations. */
  iterations: number;
  parallelism?: number;
  saltLen: number;
  keyLen: number;
};

/** OWASP 2024 recommended defaults for both algorithms. */
export const KDF_DEFAULTS: Record<KdfAlgo, KdfParams> = {
  argon2id: {
    algo: "argon2id",
    memoryKiB: 19 * 1024, // 19 MiB
    iterations: 2,
    parallelism: 1,
    saltLen: 16,
    keyLen: 32,
  },
  "pbkdf2-sha256": {
    algo: "pbkdf2-sha256",
    iterations: 600_000,
    saltLen: 16,
    keyLen: 32,
  },
};

/** Validate that KDF params meet minimums; throws on weak params. */
export function assertKdfParamsStrong(p: KdfParams): void {
  if (p.algo === "argon2id") {
    if ((p.memoryKiB ?? 0) < 15 * 1024) throw new Error("argon2id memory < 15 MiB");
    if (p.iterations < 2) throw new Error("argon2id iterations < 2");
  } else {
    if (p.iterations < 310_000) throw new Error("pbkdf2 iterations below OWASP minimum");
  }
  if (p.saltLen < 16) throw new Error("salt < 16 bytes");
  if (p.keyLen < 32) throw new Error("key < 32 bytes");
}

/* ── 5. Secure-default header bundle (Cloudflare) ──────────────────────── */

/**
 * Return a Record of response headers that enforce strong defaults.
 * Callers can spread this into Next.js `headers()` or middleware responses.
 */
export function secureHeaderBundle(opts: { reportUri?: string } = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": [
      "accelerometer=()",
      "camera=(self)",
      "geolocation=()",
      "microphone=(self)",
      "payment=(self)",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
    "Origin-Agent-Cluster": "?1",
  };
  if (opts.reportUri) {
    headers["Reporting-Endpoints"] = `default="${opts.reportUri}"`;
  }
  return headers;
}

/* ── 6. Fail-closed predicate (NordVPN kill-switch philosophy) ─────────── */

/**
 * Given an upstream health check result, return whether to allow the request
 * through. By default any uncertainty is treated as "deny".
 */
export function failClosed(check: { ok: boolean | null; latencyMs?: number }): {
  allow: boolean;
  reason?: string;
} {
  if (check.ok === true) return { allow: true };
  if (check.ok === false) return { allow: false, reason: "upstream reported failure" };
  return { allow: false, reason: "upstream status unknown — fail closed" };
}

/* ── 7. Permission minimization (Apple ATT) ────────────────────────────── */

export type ClientPermission =
  | "camera"
  | "microphone"
  | "notifications"
  | "location"
  | "contacts"
  | "health"
  | "clipboard";

/**
 * Return the smallest set of permissions needed for a given feature.
 * This is the ground truth — UI must never request more than this.
 */
export function requiredPermissions(
  feature: "voice_chat" | "portrait_capture" | "push" | "room_3d" | "time_travel",
): readonly ClientPermission[] {
  switch (feature) {
    case "voice_chat":
      return ["microphone"];
    case "portrait_capture":
      return ["camera"];
    case "push":
      return ["notifications"];
    case "room_3d":
      return []; // no sensors needed
    case "time_travel":
      return [];
  }
}

/* ── 8. Security audit rule catalog (Bitwarden Vault Health) ───────────── */

export type AuditSeverity = "info" | "warn" | "high" | "critical";

export type AuditFinding = {
  id: string;
  severity: AuditSeverity;
  title: string;
  remedy: string;
};

export type AccountSnapshot = {
  hasPasskey: boolean;
  hasTotp: boolean;
  passwordAgeDays: number;
  uniquePassword: boolean;
  emailVerified: boolean;
  recentFailedLogins: number;
  exposedInBreach: boolean;
  sessionsActive: number;
};

/** Run Bitwarden-style health checks on an account snapshot. */
export function auditAccount(snap: AccountSnapshot): AuditFinding[] {
  const findings: AuditFinding[] = [];

  if (snap.exposedInBreach) {
    findings.push({
      id: "breach_exposure",
      severity: "critical",
      title: "자격 증명이 공개 유출 목록에 포함되어 있습니다",
      remedy: "지금 즉시 비밀번호를 변경하고 Passkey 를 등록하세요.",
    });
  }
  if (!snap.hasPasskey && !snap.hasTotp) {
    findings.push({
      id: "no_second_factor",
      severity: "high",
      title: "2단계 인증이 활성화되어 있지 않습니다",
      remedy: "Passkey 또는 TOTP 를 등록하세요.",
    });
  }
  if (!snap.uniquePassword) {
    findings.push({
      id: "reused_password",
      severity: "high",
      title: "다른 서비스와 같은 비밀번호를 사용 중입니다",
      remedy: "고유한 비밀번호로 변경하세요.",
    });
  }
  if (snap.passwordAgeDays > 365) {
    findings.push({
      id: "old_password",
      severity: "warn",
      title: "비밀번호가 1년 이상 지났습니다",
      remedy: "주기적으로 갱신하는 것을 권장합니다.",
    });
  }
  if (!snap.emailVerified) {
    findings.push({
      id: "email_unverified",
      severity: "warn",
      title: "이메일이 확인되지 않았습니다",
      remedy: "인증 메일을 확인해주세요.",
    });
  }
  if (snap.recentFailedLogins > 5) {
    findings.push({
      id: "many_failed_logins",
      severity: "warn",
      title: "최근 로그인 실패가 많습니다",
      remedy: "비밀번호를 재설정하고 의심스러운 디바이스에서 로그아웃하세요.",
    });
  }
  if (snap.sessionsActive > 6) {
    findings.push({
      id: "too_many_sessions",
      severity: "info",
      title: "활성 세션이 많습니다",
      remedy: "사용하지 않는 디바이스의 세션을 정리하세요.",
    });
  }

  // Sort by severity (critical first).
  const order: Record<AuditSeverity, number> = { critical: 0, high: 1, warn: 2, info: 3 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Compute a 0-100 security score from audit findings. Higher is safer. */
export function securityScore(findings: readonly AuditFinding[]): number {
  let penalty = 0;
  for (const f of findings) {
    penalty +=
      f.severity === "critical" ? 40 : f.severity === "high" ? 20 : f.severity === "warn" ? 8 : 2;
  }
  return Math.max(0, 100 - penalty);
}

/* ── 9. Lockdown profile (Apple Lockdown Mode) ─────────────────────────── */

export type LockdownProfile = {
  /** Disable AI voice/image artifact generation. */
  blockGenerativeMedia: boolean;
  /** Force passkey for *every* sensitive action. */
  requirePasskeyForAllSensitive: boolean;
  /** Disallow any external share link creation. */
  blockExternalShares: boolean;
  /** Disallow non-essential third-party connections. */
  blockIntegrations: boolean;
  /** Shorten all session TTLs aggressively. */
  sessionTtlMs: number;
};

export const LOCKDOWN_OFF: LockdownProfile = {
  blockGenerativeMedia: false,
  requirePasskeyForAllSensitive: false,
  blockExternalShares: false,
  blockIntegrations: false,
  sessionTtlMs: ISOLATION_POLICY.normal.ttlMs,
};

export const LOCKDOWN_STRICT: LockdownProfile = {
  blockGenerativeMedia: true,
  requirePasskeyForAllSensitive: true,
  blockExternalShares: true,
  blockIntegrations: true,
  sessionTtlMs: 15 * 60 * 1000,
};

/** Return the profile that should apply given the user's chosen level. */
export function lockdownFor(level: "off" | "strict"): LockdownProfile {
  return level === "strict" ? LOCKDOWN_STRICT : LOCKDOWN_OFF;
}

/**
 * Decide whether a given action is permitted under a lockdown profile.
 * Returns a typed decision so the caller UI can explain the block cleanly.
 */
export type LockdownAction =
  | "generate_image"
  | "voice_stream"
  | "create_share_link"
  | "install_integration"
  | "passkey_gated_action";

export function allowedUnderLockdown(
  profile: LockdownProfile,
  action: LockdownAction,
): { allow: boolean; reason?: string } {
  switch (action) {
    case "generate_image":
    case "voice_stream":
      return profile.blockGenerativeMedia
        ? { allow: false, reason: "Lockdown: generative media disabled" }
        : { allow: true };
    case "create_share_link":
      return profile.blockExternalShares
        ? { allow: false, reason: "Lockdown: external shares disabled" }
        : { allow: true };
    case "install_integration":
      return profile.blockIntegrations
        ? { allow: false, reason: "Lockdown: integrations disabled" }
        : { allow: true };
    case "passkey_gated_action":
      return profile.requirePasskeyForAllSensitive
        ? { allow: true, reason: "Lockdown: passkey required" }
        : { allow: true };
  }
}

/* ── 10. Privacy budget (Brave / differential-privacy inspired) ────────── */

/**
 * A simple daily "privacy budget" that limits how much analytics / telemetry
 * a user emits in a 24h window. Going over the budget flips to minimal mode.
 */
export type PrivacyBudget = {
  /** Total units for a rolling 24h window. */
  dailyUnits: number;
  /** Units spent so far. */
  spent: number;
  /** When the window started in ms. */
  windowStartMs: number;
};

export function createPrivacyBudget(dailyUnits: number = 100, nowMs: number = Date.now()): PrivacyBudget {
  return { dailyUnits, spent: 0, windowStartMs: nowMs };
}

/** Spend `cost` units from the budget — rolls the window if it's expired. */
export function spendPrivacyBudget(
  budget: PrivacyBudget,
  cost: number,
  nowMs: number = Date.now(),
): { next: PrivacyBudget; allowed: boolean } {
  const windowMs = 24 * 60 * 60 * 1000;
  let rolled = budget;
  if (nowMs - budget.windowStartMs >= windowMs) {
    rolled = { ...budget, spent: 0, windowStartMs: nowMs };
  }
  if (rolled.spent + cost > rolled.dailyUnits) {
    return { next: rolled, allowed: false };
  }
  return { next: { ...rolled, spent: rolled.spent + cost }, allowed: true };
}

/* ── 11. Anonymous account identifier (Mullvad) ────────────────────────── */

/**
 * Produce a 12-digit grouped "account number" style identifier from a seed,
 * similar to Mullvad's anonymous accounts. Deterministic so the same seed
 * always yields the same display value — caller stores the raw seed.
 *
 * Implementation is a simple FNV-1a-style 32-bit hash extended with a second
 * pass to generate 12 digits. Intentionally avoids BigInt literals so the
 * file remains compatible with older tsconfig targets.
 */
export function anonymousAccountNumber(seedBytes: Uint8Array): string {
  const fnv = (seed: number): number => {
    let h = seed >>> 0;
    for (let i = 0; i < seedBytes.length; i++) {
      h ^= seedBytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };
  const a = fnv(0x811c9dc5); // 32-bit FNV offset basis
  const b = fnv(0xdeadbeef);
  // Fold to a 12-digit positive decimal number.
  const combined = (a * 1_000_003 + b) >>> 0;
  const twelve = String(combined % 1_000_000_000_000).padStart(12, "0");
  return `${twelve.slice(0, 4)} ${twelve.slice(4, 8)} ${twelve.slice(8, 12)}`;
}
