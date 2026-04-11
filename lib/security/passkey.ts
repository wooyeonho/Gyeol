/**
 * Passkey / WebAuthn helper — phishing-resistant second factor.
 *
 * Inspired by Apple Passkeys, 1Password, Google Password Manager, Dashlane.
 * Uses the native browser WebAuthn API (navigator.credentials) — no external
 * library. A successful passkey registration persists a public credential
 * record on the server; the private key stays in the platform authenticator
 * (Touch ID, Face ID, Android Biometrics, Windows Hello).
 *
 * This file only defines the client-side ceremony. The server needs a pair of
 * endpoints (challenge issuer + credential verifier) whose schema matches.
 */

export type PasskeyRegistrationOptions = {
  challenge: string; // base64url
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams?: Array<{ type: "public-key"; alg: number }>;
  timeout?: number;
  excludeCredentials?: Array<{ id: string; type: "public-key" }>;
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    residentKey?: "discouraged" | "preferred" | "required";
    userVerification?: "required" | "preferred" | "discouraged";
  };
};

export type PasskeyAssertionOptions = {
  challenge: string;
  rpId: string;
  allowCredentials?: Array<{ id: string; type: "public-key" }>;
  userVerification?: "required" | "preferred" | "discouraged";
  timeout?: number;
};

function b64urlToBuf(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Does the current browser support platform passkeys (Touch ID / Face ID)? */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Register a new passkey. Call this after the user clicks "Enable passkey".
 * The server must first hand you a fresh challenge.
 */
export async function registerPasskey(opts: PasskeyRegistrationOptions): Promise<{
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    attestationObject: string;
  };
}> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: b64urlToBuf(opts.challenge),
    rp: opts.rp,
    user: {
      id: b64urlToBuf(opts.user.id),
      name: opts.user.name,
      displayName: opts.user.displayName,
    },
    pubKeyCredParams: opts.pubKeyCredParams ?? [
      { type: "public-key", alg: -7 }, // ES256
      { type: "public-key", alg: -257 }, // RS256
    ],
    timeout: opts.timeout ?? 60_000,
    excludeCredentials: opts.excludeCredentials?.map((c) => ({
      id: b64urlToBuf(c.id),
      type: c.type,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required",
      ...opts.authenticatorSelection,
    },
    attestation: "none",
  };

  const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey registration cancelled");

  const response = cred.response as AuthenticatorAttestationResponse;
  return {
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: "public-key",
    response: {
      clientDataJSON: bufToB64url(response.clientDataJSON),
      attestationObject: bufToB64url(response.attestationObject),
    },
  };
}

/** Verify identity using a previously-registered passkey. */
export async function authenticatePasskey(opts: PasskeyAssertionOptions): Promise<{
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string | null;
  };
}> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: b64urlToBuf(opts.challenge),
    rpId: opts.rpId,
    allowCredentials: opts.allowCredentials?.map((c) => ({
      id: b64urlToBuf(c.id),
      type: c.type,
    })),
    userVerification: opts.userVerification ?? "required",
    timeout: opts.timeout ?? 60_000,
  };

  const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey authentication cancelled");

  const response = cred.response as AuthenticatorAssertionResponse;
  return {
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: "public-key",
    response: {
      clientDataJSON: bufToB64url(response.clientDataJSON),
      authenticatorData: bufToB64url(response.authenticatorData),
      signature: bufToB64url(response.signature),
      userHandle: response.userHandle ? bufToB64url(response.userHandle) : null,
    },
  };
}
