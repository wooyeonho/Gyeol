/**
 * Lightweight security audit log.
 *
 * Inspired by Google's "Recent security activity", GitHub's security log,
 * 1Password Watchtower. Events are append-only, stored locally first (so they
 * survive network blips) and flushed to the server in batches.
 *
 * Events are intentionally coarse-grained — enough for users to spot "huh, I
 * didn't log in from Berlin last night" without overwhelming them.
 */

export type SecurityEventType =
  | "login.success"
  | "login.failed"
  | "logout"
  | "passkey.registered"
  | "passkey.removed"
  | "passkey.used"
  | "totp.enabled"
  | "totp.disabled"
  | "totp.used"
  | "vault.locked"
  | "vault.unlocked"
  | "vault.key_rotated"
  | "password.changed"
  | "email.changed"
  | "device.trusted"
  | "device.revoked"
  | "export.requested"
  | "account.deletion_requested";

export type SecurityEvent = {
  id: string;
  type: SecurityEventType;
  at: number; // epoch ms
  device?: string;
  location?: string;
  ip?: string;
  note?: string;
};

const STORAGE_KEY = "gyeol.security.audit.v1";
const MAX_LOCAL = 200;

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readLocal(): SecurityEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SecurityEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(events: SecurityEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_LOCAL)));
  } catch {
    /* quota exceeded — give up silently, this is best-effort */
  }
}

export function recordSecurityEvent(
  event: Omit<SecurityEvent, "id" | "at"> & { at?: number },
): SecurityEvent {
  const full: SecurityEvent = {
    id: genId(),
    at: event.at ?? Date.now(),
    ...event,
  };
  const existing = readLocal();
  existing.push(full);
  writeLocal(existing);
  return full;
}

export function listLocalSecurityEvents(limit = 50): SecurityEvent[] {
  const events = readLocal();
  return events.slice(-limit).reverse();
}

export function clearLocalSecurityEvents(): void {
  writeLocal([]);
}

/**
 * Human-readable label for a security event. Used by the Security Center UI.
 * Intentionally plain English — the UI layer can translate via i18n keys.
 */
export function describeSecurityEvent(type: SecurityEventType): string {
  const map: Record<SecurityEventType, string> = {
    "login.success": "Signed in",
    "login.failed": "Sign-in attempt failed",
    logout: "Signed out",
    "passkey.registered": "Passkey registered",
    "passkey.removed": "Passkey removed",
    "passkey.used": "Passkey used to sign in",
    "totp.enabled": "Two-factor enabled",
    "totp.disabled": "Two-factor disabled",
    "totp.used": "Two-factor code verified",
    "vault.locked": "Vault locked",
    "vault.unlocked": "Vault unlocked",
    "vault.key_rotated": "Encryption key rotated",
    "password.changed": "Password changed",
    "email.changed": "Email changed",
    "device.trusted": "Device trusted",
    "device.revoked": "Device removed",
    "export.requested": "Data export requested",
    "account.deletion_requested": "Account deletion requested",
  };
  return map[type] ?? type;
}
