// Extracted redemption logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { logger } from "@/lib/logger";

export async function executeRedemption(): Promise<CronResult> {
  const lockKey = "cron:redemption";
  const acquired = await acquireCronLock(lockKey, 300);
  if (!acquired) {
    return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };
  }

  try {
    if (process.env.REDEMPTION_AUTO_APPROVE !== "true") {
      return {
        processed: 0,
        skipped: "auto_approve_disabled",
        timestamp: new Date().toISOString(),
      };
    }

    const service = createServiceClient();
    const { data: pending } = await service
      .from("redemption_requests")
      .select("id, user_id, agent_id, coins_amount, krw_requested")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (!pending?.length) {
      return { processed: 0, timestamp: new Date().toISOString() };
    }

    let fulfilled = 0;
    for (const req of pending) {
      try {
        // Stub: mark as approved. Real PG would: call payment API, then update status.
        await service
          .from("redemption_requests")
          .update({ status: "approved" })
          .eq("id", req.id);
        fulfilled++;
      } catch (e) {
        logger.error("redemption fulfill", { requestId: req.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return { processed: fulfilled, timestamp: new Date().toISOString() };
  } catch (e) {
    logger.error("redemption cron", e instanceof Error ? e : { error: e });
    return { processed: 0, error: "Redemption processing failed", timestamp: new Date().toISOString() };
  } finally {
    await releaseCronLock(lockKey);
  }
}
