import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

type CheckRateLimitOptions = {
  windowMs?: number;
  maxPerWindow?: number;
  userId?: string;
};

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function checkRateLimit(key: string, options: CheckRateLimitOptions = {}): Promise<boolean> {
  const service = createServiceClient();
  const windowMs = options.windowMs ?? WINDOW_MS;
  const maxPerWindow = options.maxPerWindow ?? MAX_PER_WINDOW;
  const currentWindowStart = new Date(Date.now() - windowMs).toISOString();

  try {
    // New schema (phase16): rl_key + created_at
    const normalizedKey = key.slice(0, 200);
    await service.from("rate_limits").delete().eq("rl_key", normalizedKey).lt("created_at", currentWindowStart);

    const { count, error: countError } = await service
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("rl_key", normalizedKey)
      .gte("created_at", currentWindowStart);
    if (countError) throw countError;

    if ((count ?? 0) >= maxPerWindow) return false;
    const { error: insertError } = await service.from("rate_limits").insert({ rl_key: normalizedKey });
    if (insertError) throw insertError;
    return true;
  } catch {
    // Legacy schema fallback (schema.sql): user_id + window_start + request_count
    const candidateUserId = options.userId ?? key;
    if (!isUuidLike(candidateUserId)) {
      // If schema is legacy and we do not have a valid UUID key, fail-open.
      return true;
    }
    const bucket = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
    const { data: row, error: selectError } = await service
      .from("rate_limits")
      .select("id, request_count")
      .eq("user_id", candidateUserId)
      .eq("window_start", bucket)
      .maybeSingle();
    if (selectError) {
      console.error("[RateLimit] Legacy select failed", selectError);
      return true;
    }
    const count = row?.request_count ?? 0;
    if (count >= maxPerWindow) return false;
    if (row?.id) {
      const { error: updateError } = await service
        .from("rate_limits")
        .update({ request_count: count + 1 })
        .eq("id", row.id);
      if (updateError) {
        console.error("[RateLimit] Legacy update failed", updateError);
        return true;
      }
      return true;
    }
    const { error: insertError } = await service.from("rate_limits").insert({
      user_id: candidateUserId,
      window_start: bucket,
      request_count: 1,
    });
    if (insertError) {
      console.error("[RateLimit] Legacy insert failed", insertError);
      return true;
    }
    return true;
  }
}
