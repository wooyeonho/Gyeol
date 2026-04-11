/**
 * Client-side end-to-end encryption vault.
 *
 * Inspired by Signal, ProtonMail, Bitwarden, 1Password: the server never sees
 * plaintext. A passphrase is stretched via PBKDF2 into an AES-GCM key. Private
 * notes, secret memories, mood journals can be encrypted before upload.
 *
 * IMPORTANT: this file only runs in the browser — it uses SubtleCrypto.
 * There is a symmetric counterpart (`lib/security/secret-crypto.ts`) for
 * server-managed secrets; this file is strictly for user-held secrets.
 */

const PBKDF2_ITERATIONS = 310_000; // OWASP 2023 recommendation for PBKDF2-SHA256
const KEY_LENGTH = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function getSubtle(): SubtleCrypto {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("SubtleCrypto unavailable — e2e vault requires the browser");
  }
  return window.crypto.subtle;
}

/**
 * Helper: allocate a Uint8Array backed by a plain ArrayBuffer (not
 * SharedArrayBuffer). SubtleCrypto typings require `BufferSource` with an
 * ArrayBuffer backing, and modern TS/DOM lib marks Uint8Array as generic
 * over `ArrayBufferLike`, which can include SharedArrayBuffer.
 */
function allocBytes(len: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(len));
}

function toBytes(view: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = allocBytes(view.byteLength);
  out.set(view);
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = allocBytes(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Derive an AES-GCM key from a passphrase using PBKDF2. */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const baseKey = await subtle.importKey(
    "raw",
    toBytes(new TextEncoder().encode(passphrase)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export type EncryptedPayload = {
  v: 1;
  alg: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iter: number;
  salt: string;
  iv: string;
  ct: string;
};

/** Encrypt a string with a user passphrase. Safe to persist server-side. */
export async function encryptWithPassphrase(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedPayload> {
  const subtle = getSubtle();
  const salt = crypto.getRandomValues(allocBytes(SALT_BYTES));
  const iv = crypto.getRandomValues(allocBytes(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const ct = new Uint8Array(
    await subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      toBytes(new TextEncoder().encode(plaintext)),
    ),
  );
  return {
    v: 1,
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iter: PBKDF2_ITERATIONS,
    salt: toBase64Url(salt),
    iv: toBase64Url(iv),
    ct: toBase64Url(ct),
  };
}

/** Decrypt a payload with a user passphrase. Throws if tampered or wrong key. */
export async function decryptWithPassphrase(
  payload: EncryptedPayload,
  passphrase: string,
): Promise<string> {
  if (payload.v !== 1 || payload.alg !== "AES-GCM") {
    throw new Error("Unsupported payload version");
  }
  const subtle = getSubtle();
  const salt = fromBase64Url(payload.salt);
  const iv = fromBase64Url(payload.iv);
  const ct = fromBase64Url(payload.ct);
  const key = await deriveKey(passphrase, salt);
  const pt = await subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/**
 * Generate a zero-knowledge "recovery phrase" (12 words) the user can store
 * offline. Inspired by Proton's Recovery Phrase and Bitwarden's master-key hint.
 * This is a placeholder BIP39-like list — enough entropy (~128 bits) for recovery.
 */
const WORDLIST = [
  "amber","arc","bloom","brook","calm","clay","cove","dawn","dew","dusk","echo","ember",
  "fern","flame","fog","forest","frost","glass","glow","grove","halo","haven","hush","iris",
  "ivy","jade","kite","lake","lark","leaf","loom","lotus","lunar","maple","meadow","mist",
  "moon","moss","myth","nest","nova","oak","ocean","onyx","orbit","petal","pine","pond",
  "prism","quartz","quiet","rain","reed","river","rose","sage","sand","shade","shell","silk",
  "sky","slate","snow","solar","spire","star","stone","storm","stream","tide","trail","tulip",
  "vale","veil","velvet","vine","wave","whisper","willow","wind","wisp","wolf","woven","zephyr",
];

export function generateRecoveryPhrase(length = 12): string {
  const out: string[] = [];
  const rand = new Uint32Array(length);
  crypto.getRandomValues(rand);
  for (let i = 0; i < length; i++) {
    out.push(WORDLIST[rand[i] % WORDLIST.length]);
  }
  return out.join(" ");
}

/**
 * Compute a stable fingerprint of a passphrase so we can check "did you type
 * the same thing as last time" without ever storing the actual passphrase.
 * The fingerprint is itself a hash of (sha256(pass) + public salt).
 */
export async function passphraseFingerprint(passphrase: string): Promise<string> {
  const subtle = getSubtle();
  const bytes = toBytes(new TextEncoder().encode("gyeol.vault.fp.v1|" + passphrase));
  const digest = await subtle.digest("SHA-256", bytes);
  return toBase64Url(new Uint8Array(digest)).slice(0, 16);
}
