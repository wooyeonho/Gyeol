import crypto from "crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.CONNECTION_TOKEN_KEY;
  if (!raw) return null;
  // Normalize any key string into 32-byte key material.
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decodeStoredSecret(stored: string): { secret: string | null; legacyPlaintext: boolean } {
  if (!stored.startsWith(PREFIX)) {
    return { secret: stored, legacyPlaintext: true };
  }

  const key = getKey();
  if (!key) return { secret: null, legacyPlaintext: false };

  try {
    const payload = stored.slice(PREFIX.length);
    const [ivRaw, tagRaw, dataRaw] = payload.split(".");
    if (!ivRaw || !tagRaw || !dataRaw) return { secret: null, legacyPlaintext: false };
    const iv = Buffer.from(ivRaw, "base64url");
    const tag = Buffer.from(tagRaw, "base64url");
    const encrypted = Buffer.from(dataRaw, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return { secret: plain, legacyPlaintext: false };
  } catch {
    return { secret: null, legacyPlaintext: false };
  }
}
