import crypto from "crypto";
import { NextRequest } from "next/server";

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verifies cron request authenticity.
 *
 * Supports two modes:
 * 1. Enhanced (preferred): HMAC-SHA256 over timestamp to prevent replay attacks.
 *    Caller sets:
 *      X-Cron-Timestamp: <unix_ms>
 *      X-Cron-Signature: <hex(HMAC-SHA256(CRON_SECRET, timestamp_string))>
 * 2. Simple Bearer token: Authorization: Bearer <CRON_SECRET>
 *    Used by Vercel's built-in cron scheduler.
 */
export function checkCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const timestamp = request.headers.get("x-cron-timestamp");
  const signature = request.headers.get("x-cron-signature");

  // Enhanced HMAC verification
  if (timestamp && signature) {
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > TIMESTAMP_TOLERANCE_MS) return false;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(timestamp)
      .digest("hex");

    try {
      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature.toLowerCase(), "hex"),
        Buffer.from(expected, "hex")
      );
    } catch {
      return false;
    }
  }

  // Fallback: simple Bearer token (for Vercel cron)
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
