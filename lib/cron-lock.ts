import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const FAIL_MODE = process.env.CRON_LOCK_FAIL_MODE === "open" ? "open" : "closed";

export async function acquireCronLock(jobName: string, ttlSeconds = 300): Promise<boolean> {
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc("acquire_cron_lock", {
      p_job_name: jobName,
      p_ttl_seconds: ttlSeconds,
    });
    if (error) {
      logger.error("[CronLock] acquire rpc error", { jobName, error: error.message });
      return FAIL_MODE === "closed" ? false : true;
    }
    return Boolean(data);
  } catch (e) {
    logger.error("[CronLock] acquire unexpected error", { jobName, error: e instanceof Error ? e.message : String(e) });
    return FAIL_MODE === "closed" ? false : true;
  }
}

export async function releaseCronLock(jobName: string): Promise<void> {
  try {
    const db = createServiceClient();
    await db.rpc("release_cron_lock", { p_job_name: jobName });
  } catch (e) {
    logger.error("[CronLock] release error", { jobName, error: e instanceof Error ? e.message : String(e) });
  }
}
