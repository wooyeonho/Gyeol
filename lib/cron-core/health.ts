// Extracted health check logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { computeAutonomyHealthScore } from "@/lib/ops/health-score";
import { emitSystemAlert } from "@/lib/ops/alerts";
import { logger } from "@/lib/logger";

export async function executeHealth(): Promise<CronResult> {
  try {
    const service = createServiceClient();
    const staleSince = new Date(Date.now() - 24 * 3600000).toISOString();
    const staleSixHours = new Date(Date.now() - 6 * 3600000).toISOString();
    const { count: agentCount } = await service.from("agents").select("id", { count: "exact", head: true });
    const { data: configRows } = await service.from("agent_state").select("config");
    const autonomousEnabledCount = (configRows ?? []).filter(
      (row) => (row.config as Record<string, unknown> | null)?.autonomous_enabled !== false,
    ).length;
    const { data: echoAgents } = await service
      .from("agent_state")
      .select("agent_id")
      .eq("status", "echo");
    const { data: lowVitality } = await service
      .from("agent_state")
      .select("agent_id, vitality")
      .lt("vitality", 0.5)
      .neq("status", "echo");
    const { data: staleHeartbeatAgents } = await service
      .from("agent_state")
      .select("agent_id, last_heartbeat_at")
      .or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${staleSince}`);
    const { data: staleHeartbeatSixHours } = await service
      .from("agent_state")
      .select("agent_id, last_heartbeat_at")
      .or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${staleSixHours}`);
    const { data: staleDreamAgents } = await service
      .from("agent_state")
      .select("agent_id, last_dream_at")
      .or(`last_dream_at.is.null,last_dream_at.lt.${staleSince}`);

    let cronFreshness: Array<{ job_name: string; updated_at: string; stale: boolean }> = [];
    try {
      const { data: lockRows } = await service
        .from("cron_job_locks")
        .select("job_name, updated_at")
        .in("job_name", [
          "cron:heartbeat",
          "cron:time-capsule",
          "cron:retention",
          "cron:social",
          "cron:learner",
          "cron:crawl",
          "cron:dream",
          "cron:world",
          "cron:lifeline",
          "cron:recap",
        ]);
      const now = Date.now();
      cronFreshness = (lockRows ?? []).map((row) => {
        const updated = new Date(String(row.updated_at)).getTime();
        const stale = Number.isNaN(updated) ? true : now - updated > 24 * 3600000;
        return {
          job_name: String(row.job_name),
          updated_at: String(row.updated_at),
          stale,
        };
      });
    } catch (e) {
      logger.error("health cron freshness lookup", e instanceof Error ? e : { error: e });
    }

    const staleCronJobs = cronFreshness.filter((j) => j.stale).length;
    const autonomyHealth = computeAutonomyHealthScore({
      totalAgents: agentCount ?? 0,
      staleHeartbeat6h: staleHeartbeatSixHours?.length ?? 0,
      staleDream24h: staleDreamAgents?.length ?? 0,
      echoAgents: echoAgents?.length ?? 0,
      staleCronJobs,
      totalCronJobs: 9,
    });

    if (autonomyHealth.tier === "critical") {
      await emitSystemAlert(
        {
          level: "critical",
          source: "cron-health",
          code: "AUTONOMY_HEALTH_CRITICAL",
          message: `Autonomy health score is critical (${autonomyHealth.score})`,
          details: {
            stale_heartbeat_6h: staleHeartbeatSixHours?.length ?? 0,
            stale_dream_24h: staleDreamAgents?.length ?? 0,
            stale_cron_jobs_24h: staleCronJobs,
            echo_count: echoAgents?.length ?? 0,
          },
        },
        { cooldownMinutes: 120, notifySlack: true, notifyEmail: true },
      );
    } else if (autonomyHealth.tier === "warning") {
      await emitSystemAlert(
        {
          level: "warning",
          source: "cron-health",
          code: "AUTONOMY_HEALTH_WARNING",
          message: `Autonomy health score is warning (${autonomyHealth.score})`,
          details: {
            stale_heartbeat_6h: staleHeartbeatSixHours?.length ?? 0,
            stale_dream_24h: staleDreamAgents?.length ?? 0,
            stale_cron_jobs_24h: staleCronJobs,
            echo_count: echoAgents?.length ?? 0,
          },
        },
        { cooldownMinutes: 240, notifySlack: false },
      );
    }

    return {
      ok: true,
      processed: 1,
      timestamp: new Date().toISOString(),
      agents_total: agentCount ?? 0,
      agents_autonomous_enabled: autonomousEnabledCount ?? 0,
      agents_echo: echoAgents?.length ?? 0,
      agents_low_vitality: lowVitality?.length ?? 0,
      agents_stale_heartbeat_6h: staleHeartbeatSixHours?.length ?? 0,
      agents_stale_heartbeat_24h: staleHeartbeatAgents?.length ?? 0,
      agents_stale_dream_24h: staleDreamAgents?.length ?? 0,
      cron_freshness: cronFreshness,
      autonomy_health: autonomyHealth,
    };
  } catch (e) {
    logger.error("health check", e instanceof Error ? e : { error: e });
    return {
      ok: false,
      processed: 0,
      error: "Health check failed",
      timestamp: new Date().toISOString(),
    };
  }
}
