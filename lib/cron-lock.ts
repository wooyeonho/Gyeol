import { createServiceClient } from "@/lib/supabase/service";

const FAIL_MODE = process.env.CRON_LOCK_FAIL_MODE === "closed" ? "closed" : "open";

export async function acquireCronLock(jobName: string, ttlSeconds = 300): Promise<boolean> {
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc("acquire_cron_lock", {
      p_job_name: jobName,
      p_ttl_seconds: ttlSeconds,
    });
    if (error) {
      console.error("[CronLock] acquire rpc error", jobName, error.message);
      return FAIL_MODE === "closed" ? false : true;
    }
    return Boolean(data);
  } catch (e) {
    console.error("[CronLock] acquire unexpected error", jobName, e);
    return FAIL_MODE === "closed" ? false : true;
  }
}

export async function releaseCronLock(jobName: string): Promise<void> {
  try {
    const db = createServiceClient();
    await db.rpc("release_cron_lock", { p_job_name: jobName });
  } catch (e) {
    console.error("[CronLock] release error", jobName, e);
  }
}
