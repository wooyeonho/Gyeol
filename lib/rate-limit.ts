import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const FAIL_MODE = process.env.RATE_LIMIT_FAIL_MODE === "open" ? "open" : "closed";

/**
 * Compute the start of the current 1-minute window, truncated to the minute.
 * This aligns with the `window_start` NOT NULL column in `rate_limits`.
 */
function currentWindowStart(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

export async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const service = createServiceClient();
    const expiry = new Date(Date.now() - WINDOW_MS).toISOString();
    const windowStart = currentWindowStart();

    // Remove expired entries for this key.
    await service.from("rate_limits").delete().eq("rl_key", key).lt("created_at", expiry);

    // Count requests in current window.
    const { count } = await service
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("rl_key", key)
      .gte("created_at", new Date(Date.now() - WINDOW_MS).toISOString());

    if ((count ?? 0) >= MAX_PER_WINDOW) return false;

    // Insert with all required columns so the row satisfies NOT NULL constraints.
    // `user_id` is extracted from the key pattern "action:uuid"; if the key does
    // not contain a valid UUID we fall back to the nil UUID.
    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = key.match(UUID_RE);
    const userId = uuidMatch ? uuidMatch[0] : "00000000-0000-0000-0000-000000000000";

    await service.from("rate_limits").insert({
      rl_key: key,
      user_id: userId,
      window_start: windowStart,
    });
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
