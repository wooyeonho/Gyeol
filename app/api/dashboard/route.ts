import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { computeAutonomyHealthScore } from "@/lib/ops/health-score";

export async function GET() {
  try {
    const service = createServiceClient();
    const [agentsRes, socialRes, worldRes, artifactsRes, stateRes] = await Promise.all([
      service.from("agents").select("id", { count: "exact", head: true }),
      service.from("social_logs").select("id", { count: "exact", head: true }),
      service.from("world_state").select("collective_emotion, weather").eq("id", "global").single(),
      service.from("artifacts").select("id", { count: "exact", head: true }),
      service.from("agent_state").select("config, last_heartbeat_at, last_dream_at, status"),
    ]);

    const agentCount = (agentsRes as { count?: number })?.count ?? 0;
    const socialCount = (socialRes as { count?: number })?.count ?? 0;
    const artifactCount = (artifactsRes as { count?: number })?.count ?? 0;
    const world = worldRes.data as { collective_emotion?: Record<string, number>; weather?: { name?: string } } | null;
    const states = (stateRes.data ?? []) as Array<{
      config?: Record<string, unknown> | null;
      last_heartbeat_at?: string | null;
      last_dream_at?: string | null;
      status?: string | null;
    }>;
    const now = Date.now();
    const staleHeartbeat6h = states.filter((s) => {
      if (!s.last_heartbeat_at) return true;
      return now - new Date(s.last_heartbeat_at).getTime() > 6 * 3600000;
    }).length;
    const staleDream24h = states.filter((s) => {
      if (!s.last_dream_at) return true;
      return now - new Date(s.last_dream_at).getTime() > 24 * 3600000;
    }).length;
    const autonomyEnabled = states.filter((s) => s.config?.autonomous_enabled !== false).length;
    const echoCount = states.filter((s) => s.status === "echo").length;

    let cronFreshness: Array<{ job_name: string; minutes_since_update: number }> = [];
    try {
      const { data: locks } = await service
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
      cronFreshness = (locks ?? []).map((lock) => {
        const updatedAt = new Date(String(lock.updated_at)).getTime();
        const minutes = Number.isNaN(updatedAt) ? 999999 : Math.floor((now - updatedAt) / 60000);
        return {
          job_name: String(lock.job_name),
          minutes_since_update: minutes,
        };
      });
    } catch {
      cronFreshness = [];
    }

    const staleCronJobs24h = cronFreshness.filter((j) => j.minutes_since_update > 1440).length;
    const autonomyHealth = computeAutonomyHealthScore({
      totalAgents: states.length,
      staleHeartbeat6h,
      staleDream24h,
      echoAgents: echoCount,
      staleCronJobs: staleCronJobs24h,
      totalCronJobs: 9,
    });

    return NextResponse.json({
      agent_count: agentCount,
      social_count: socialCount,
      artifact_count: artifactCount,
      collective_emotion: world?.collective_emotion ?? null,
      weather_name: world?.weather?.name ?? null,
      autonomy_enabled_count: autonomyEnabled,
      stale_heartbeat_6h: staleHeartbeat6h,
      stale_dream_24h: staleDream24h,
      echo_count: echoCount,
      cron_freshness: cronFreshness,
      autonomy_health: autonomyHealth,
    });
  } catch (e) {
    console.error("dashboard GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
