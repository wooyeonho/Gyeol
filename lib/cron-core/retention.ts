// Extracted retention logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { logger } from "@/lib/logger";

const DEFAULT_RETENTION_DAYS = 90;

function getRetentionDays() {
  const raw = Number(process.env.PRODUCT_EVENTS_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
  if (!Number.isFinite(raw) || raw < 7) return DEFAULT_RETENTION_DAYS;
  return Math.floor(raw);
}

export async function executeRetention(): Promise<CronResult> {
  const lockKey = "cron:retention";
  const acquired = await acquireCronLock(lockKey, 300);
  if (!acquired) return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock", deleted: 0 };

  try {
    const retentionDays = getRetentionDays();
    const cutoffIso = new Date(Date.now() - retentionDays * 24 * 3600000).toISOString();
    const service = createServiceClient();

    const { data: rowsToDelete } = await service
      .from("product_events")
      .select("id")
      .lt("created_at", cutoffIso)
      .limit(5000);

    const ids = (rowsToDelete ?? []).map((row) => (row as { id: string }).id);
    if (ids.length === 0) {
      return {
        processed: 1,
        deleted: 0,
        retention_days: retentionDays,
        timestamp: new Date().toISOString(),
      };
    }

    const { error: deleteError } = await service.from("product_events").delete().in("id", ids);
    if (deleteError) {
      logger.error("[Retention] delete failed", { error: deleteError.message });
      return {
        processed: 0,
        error: "Delete failed",
        detail: deleteError.message,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      processed: 1,
      deleted: ids.length,
      retention_days: retentionDays,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await releaseCronLock(lockKey);
  }
}
