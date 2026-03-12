import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const FAIL_MODE = process.env.RATE_LIMIT_FAIL_MODE === "open" ? "open" : "closed";

export async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const service = createServiceClient();
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

    // Remove expired entries for this key.
    await service.from("rate_limits").delete().eq("rl_key", key).lt("created_at", windowStart);

    // Count requests in current window.
    const { count } = await service
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("rl_key", key)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= MAX_PER_WINDOW) return false;

    await service.from("rate_limits").insert({ rl_key: key });
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
