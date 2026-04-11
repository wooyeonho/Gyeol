/**
 * TOTP (RFC 6238) — Time-based One-Time Password.
 *
 * Compatible with Google Authenticator, Authy, 1Password, Microsoft
 * Authenticator, Aegis, Raivo OTP, any RFC-6238 conforming app.
 *
 * Generation happens client-side (browser SubtleCrypto) for interactive
 * verification flows, or server-side (Node webcrypto) during enrollment.
 */

const DEFAULT_PERIOD = 30;
const DEFAULT_DIGITS = 6;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

function base32Decode(input: string): Uint8Array<ArrayBuffer> {
  const clean = input.replace(/=+$/g, "").toUpperCase().replace(/\s+/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const out = new Uint8Array(new ArrayBuffer(bytes.length));
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i];
  return out;
}

function getSubtle(): SubtleCrypto {
  if (typeof globalThis.crypto?.subtle === "undefined") {
    throw new Error("SubtleCrypto not available in this environment");
  }
  return globalThis.crypto.subtle;
}

/** Generate a fresh 160-bit shared secret and return its base32 form. */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/** Compute the current TOTP code for a secret. */
export async function computeTotp(
  secret: string,
  options: { timestamp?: number; period?: number; digits?: number } = {},
): Promise<string> {
  const period = options.period ?? DEFAULT_PERIOD;
  const digits = options.digits ?? DEFAULT_DIGITS;
  const timestamp = options.timestamp ?? Date.now();

  // 64-bit counter packed big-endian. JS only supports 32-bit bitwise, so we
  // divide by 256 per byte rather than shift, to stay safe past 2^32.
  const counter = Math.floor(timestamp / 1000 / period);
  const counterBytes = new Uint8Array(new ArrayBuffer(8));
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  const keyBytes = base32Decode(secret);
  const subtle = getSubtle();
  const key = await subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const hmac = new Uint8Array(await subtle.sign("HMAC", key, counterBytes));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** digits;
  return (binary % mod).toString().padStart(digits, "0");
}

/**
 * Verify a user-submitted TOTP code with a ±1 period window (to cover clock
 * drift, which is how Google Authenticator & friends behave in practice).
 */
export async function verifyTotp(
  secret: string,
  code: string,
  options: { window?: number; period?: number; digits?: number } = {},
): Promise<boolean> {
  const window = options.window ?? 1;
  const period = options.period ?? DEFAULT_PERIOD;
  const digits = options.digits ?? DEFAULT_DIGITS;
  const now = Date.now();
  const normalized = code.replace(/\s+/g, "");
  if (normalized.length !== digits) return false;
  for (let delta = -window; delta <= window; delta++) {
    const candidate = await computeTotp(secret, {
      timestamp: now + delta * period * 1000,
      period,
      digits,
    });
    if (timingSafeEqual(candidate, normalized)) return true;
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Build a `otpauth://` URI — paste into any authenticator app or render as QR. */
export function buildOtpAuthUri(opts: {
  issuer: string;
  account: string;
  secret: string;
  digits?: number;
  period?: number;
}): string {
  const label = encodeURIComponent(`${opts.issuer}:${opts.account}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    algorithm: "SHA1",
    digits: String(opts.digits ?? DEFAULT_DIGITS),
    period: String(opts.period ?? DEFAULT_PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
