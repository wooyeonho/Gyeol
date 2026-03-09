import { afterEach, describe, expect, it } from "vitest";
import { decodeStoredSecret, encryptSecret } from "./secret-crypto";

const ORIGINAL_KEY = process.env.CONNECTION_TOKEN_KEY;

describe("secret-crypto", () => {
  afterEach(() => {
    if (ORIGINAL_KEY == null) delete process.env.CONNECTION_TOKEN_KEY;
    else process.env.CONNECTION_TOKEN_KEY = ORIGINAL_KEY;
  });

  it("encrypts and decrypts a secret token", () => {
    process.env.CONNECTION_TOKEN_KEY = "test-connection-key-1234567890";
    const encrypted = encryptSecret("my-secret-token");
    expect(encrypted).toBeTruthy();
    const decoded = decodeStoredSecret(encrypted!);
    expect(decoded.legacyPlaintext).toBe(false);
    expect(decoded.secret).toBe("my-secret-token");
  });

  it("treats non-prefixed data as legacy plaintext", () => {
    const decoded = decodeStoredSecret("plain-token");
    expect(decoded.legacyPlaintext).toBe(true);
    expect(decoded.secret).toBe("plain-token");
  });

  it("fails decryption without key for encrypted payload", () => {
    process.env.CONNECTION_TOKEN_KEY = "test-connection-key-1234567890";
    const encrypted = encryptSecret("value");
    delete process.env.CONNECTION_TOKEN_KEY;
    const decoded = decodeStoredSecret(encrypted!);
    expect(decoded.secret).toBeNull();
    expect(decoded.legacyPlaintext).toBe(false);
  });
});
