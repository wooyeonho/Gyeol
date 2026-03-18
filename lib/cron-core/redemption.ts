// Extracted redemption logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

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
        console.error("redemption fulfill", req.id, e);
      }
    }

    return { processed: fulfilled, timestamp: new Date().toISOString() };
  } catch (e) {
    console.error("redemption cron", e);
    return { processed: 0, error: "Redemption processing failed", timestamp: new Date().toISOString() };
  } finally {
    await releaseCronLock(lockKey);
  }
}
