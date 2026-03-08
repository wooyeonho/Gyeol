import crypto from "crypto";

const ENCRYPTED_PREFIX = "enc:v1:";

function getEncryptionKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!raw || raw.trim().length < 16) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function encryptSecret(value: string): string {
  if (!value) return value;
  if (value.startsWith(ENCRYPTED_PREFIX)) return value;
  const key = getEncryptionKey();
  if (!key) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${b64urlEncode(iv)}.${b64urlEncode(tag)}.${b64urlEncode(encrypted)}`;
}

export function decryptSecret(value: string): string {
  if (!value) return value;
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  const key = getEncryptionKey();
  if (!key) return "";

  try {
    const payload = value.slice(ENCRYPTED_PREFIX.length);
    const [ivPart, tagPart, dataPart] = payload.split(".");
    if (!ivPart || !tagPart || !dataPart) return "";
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, b64urlDecode(ivPart));
    decipher.setAuthTag(b64urlDecode(tagPart));
    const decrypted = Buffer.concat([decipher.update(b64urlDecode(dataPart)), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}
