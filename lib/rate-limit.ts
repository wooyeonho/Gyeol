import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MS = 60_000;
const DEFAULT_MAX_PER_WINDOW = 30;
const FAIL_MODE = process.env.RATE_LIMIT_FAIL_MODE === "open" ? "open" : "closed";

/**
 * Plan-based rate limit tiers.
 * Keys match the key suffix pattern "chat:<uuid>" → "chat", "api:<uuid>" → "api".
 */
const TIER_LIMITS: Record<string, number> = {
  free: 15,
  pro: 40,
  premium: 80,
};

function getMaxPerWindow(tier?: string | null): number {
  if (tier && tier in TIER_LIMITS) return TIER_LIMITS[tier];
  return DEFAULT_MAX_PER_WINDOW;
}

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

export async function checkRateLimit(key: string, tier?: string | null): Promise<boolean> {
  try {
    const service = createServiceClient();
    const expiry = new Date(Date.now() - WINDOW_MS).toISOString();
    const windowStart = currentWindowStart();
    const userId = extractUserId(key);

    // Remove expired entries for this key (fire-and-forget).
    await service.from("rate_limits").delete().eq("rl_key", key).lt("created_at", expiry);

    // Atomic check-and-increment: a single RPC that inserts or increments
    // the counter AND checks against the limit in one statement.
    // This eliminates the TOCTOU race where separate SELECT + UPSERT
    // allowed concurrent requests to bypass the limit.
    const { data: allowed, error: rpcError } = await service.rpc("check_and_increment_rate_limit", {
      p_rl_key: key,
      p_user_id: userId,
      p_window_start: windowStart,
      p_max_requests: getMaxPerWindow(tier),
    });

    if (!rpcError) {
      return Boolean(allowed);
    }

    // Fallback: if the new RPC isn't deployed yet, use the legacy path.
    // This has a small TOCTOU window but is better than failing entirely.
    console.warn("[RateLimit] atomic RPC unavailable, using legacy path:", rpcError.message);

    const { data: existing } = await service
      .from("rate_limits")
      .select("request_count")
      .eq("rl_key", key)
      .eq("user_id", userId)
      .eq("window_start", windowStart)
      .maybeSingle();

    const currentCount = existing?.request_count ?? 0;
    if (currentCount >= getMaxPerWindow(tier)) return false;

    const { error: upsertError } = await service.rpc("upsert_rate_limit", {
      p_rl_key: key,
      p_user_id: userId,
      p_window_start: windowStart,
    });

    if (upsertError) {
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
