/**
 * WebAuthn Biometric Authentication — FIDO2/passkey support.
 *
 * Enables passwordless login via fingerprint, Face ID, or security keys.
 * Inspired by 1Password/Signal security practices.
 */

export interface PublicKeyCredentialData {
  credentialId: string;
  publicKey: string;
  userId: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string;
}

/**
 * Check if WebAuthn is supported in the current browser.
 */
export function isWebAuthnSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

/**
 * Check if a platform authenticator (biometric) is available.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Generate registration options for WebAuthn credential creation.
 */
export function generateRegistrationOptions(userId: string, userName: string): PublicKeyCredentialCreationOptions {
  const challenge = new Uint8Array(32);
  if (typeof crypto !== "undefined") {
    crypto.getRandomValues(challenge);
  }

  return {
    challenge,
    rp: {
      name: "GYEOL",
      id: typeof window !== "undefined" ? window.location.hostname : "gyeol-ai.vercel.app",
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },   // ES256
      { alg: -257, type: "public-key" },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
    attestation: "none",
  };
}

/**
 * Generate authentication options for WebAuthn credential assertion.
 */
export function generateAuthenticationOptions(allowCredentialIds: string[]): PublicKeyCredentialRequestOptions {
  const challenge = new Uint8Array(32);
  if (typeof crypto !== "undefined") {
    crypto.getRandomValues(challenge);
  }

  return {
    challenge,
    rpId: typeof window !== "undefined" ? window.location.hostname : "gyeol-ai.vercel.app",
    allowCredentials: allowCredentialIds.map((id) => ({
      id: base64ToBuffer(id),
      type: "public-key" as const,
      transports: ["internal" as AuthenticatorTransport],
    })),
    userVerification: "required",
    timeout: 60000,
  };
}

/**
 * Convert ArrayBuffer to base64 string for storage.
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Convert base64 string back to ArrayBuffer.
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
