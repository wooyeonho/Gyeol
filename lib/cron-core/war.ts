// Extracted war logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

export async function executeWar(): Promise<CronResult> {
  const lockKey = "cron:war";
  const acquired = await acquireCronLock(lockKey, 120);
  if (!acquired) {
    return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };
  }

  try {
    const db = createServiceClient();
    const now = new Date().toISOString();

    const { data: expired } = await db
      .from("war_events")
      .select("id")
      .eq("status", "active")
      .lt("ends_at", now);

    let resolved = 0;
    for (const ev of expired ?? []) {
      const { error } = await db
        .from("war_events")
        .update({ status: "resolved" })
        .eq("id", ev.id);
      if (!error) resolved++;
      else console.error("war resolve", ev.id, error);
    }

    return { processed: resolved, resolved, timestamp: new Date().toISOString() };
  } catch (e) {
    console.error("war cron", e);
    return { processed: 0, error: "War processing failed", timestamp: new Date().toISOString() };
  } finally {
    await releaseCronLock(lockKey);
  }
}
