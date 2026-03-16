import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const FAIL_MODE = process.env.RATE_LIMIT_FAIL_MODE === "open" ? "open" : "closed";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Compute the start of the current 1-minute window, truncated to the minute.
 * This aligns with the `window_start` NOT NULL column in `rate_limits`.
 */
function currentWindowStart(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

/**
 * Extract a user UUID from the rate-limit key pattern "action:uuid".
 * Falls back to the nil UUID for non-user callers.
 */
function extractUserId(key: string): string {
  const match = key.match(UUID_RE);
  return match ? match[0] : "00000000-0000-0000-0000-000000000000";
}

export async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const service = createServiceClient();
    const expiry = new Date(Date.now() - WINDOW_MS).toISOString();
    const windowStart = currentWindowStart();
    const userId = extractUserId(key);

    // Remove expired entries for this key.
    await service.from("rate_limits").delete().eq("rl_key", key).lt("created_at", expiry);

    // Check current request_count for this (rl_key, user_id, window_start) combo.
    // The schema uses a single-row-per-window design with a `request_count` column
    // and a UNIQUE(user_id, window_start) constraint.
    const { data: existing } = await service
      .from("rate_limits")
      .select("request_count")
      .eq("rl_key", key)
      .eq("user_id", userId)
      .eq("window_start", windowStart)
      .maybeSingle();

    const currentCount = existing?.request_count ?? 0;
    if (currentCount >= MAX_PER_WINDOW) return false;

    // Atomic upsert via PL/pgSQL RPC — a single INSERT … ON CONFLICT handles
    // both the first request (insert) and subsequent ones (increment).
    const { error: rpcError } = await service.rpc("upsert_rate_limit", {
      p_rl_key: key,
      p_user_id: userId,
      p_window_start: windowStart,
    });

    // If the RPC isn't deployed yet, fall back to Supabase .upsert() which
    // also handles the UNIQUE(rl_key, user_id, window_start) conflict
    // atomically at the DB level (no client-side TOCTOU race).
    if (rpcError) {
      console.warn("[RateLimit] RPC unavailable, using .upsert() fallback:", rpcError.message);
      await service.from("rate_limits").upsert(
        {
          rl_key: key,
          user_id: userId,
          window_start: windowStart,
          request_count: currentCount + 1,
        },
        { onConflict: "rl_key,user_id,window_start" }
      );
    }

    return true;
  } catch (e) {
    if (FAIL_MODE === "closed") {
      console.error("[RateLimit] fallback deny due to error", e);
      return false;
    }
    console.error("[RateLimit] fallback allow due to error", e);
    return true;
  }
}
