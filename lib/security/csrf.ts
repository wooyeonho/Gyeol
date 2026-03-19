import { NextRequest } from "next/server";

/**
 * Validates that a state-changing request originates from our own domain.
 *
 * Checks the Origin header (preferred) and falls back to Referer.
 * Returns `true` if the request is safe to process.
 *
 * NOTE: This is a synchronous, stateless check — no tokens needed when
 * combined with SameSite cookies.
 */
export function verifyCsrfOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!host) return false;

  const allowedOrigins = new Set([
    `https://${host}`,
    `http://${host}`, // local dev
  ]);

  // Custom override for preview / staging deploys
  const extra = process.env.CSRF_ALLOWED_ORIGINS;
  if (extra) {
    for (const o of extra.split(",")) {
      const trimmed = o.trim();
      if (trimmed) allowedOrigins.add(trimmed);
    }
  }

  if (origin) return allowedOrigins.has(origin);

  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // No Origin/Referer — likely a non-browser client (API key auth handles this separately)
  return false;
}
