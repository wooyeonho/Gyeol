import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";

/**
 * Optional health check per HEARTBEAT.md: "Every 30 min: Check agent status"
 * Returns agent counts and basic status for monitoring.
 */
export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const service = createServiceClient();
    const staleSince = new Date(Date.now() - 24 * 3600000).toISOString();
    const { count: agentCount } = await service.from("agents").select("id", { count: "exact", head: true });
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
    const { data: staleDreamAgents } = await service
      .from("agent_state")
      .select("agent_id, last_dream_at")
      .or(`last_dream_at.is.null,last_dream_at.lt.${staleSince}`);

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        agents_total: agentCount ?? 0,
        agents_echo: echoAgents?.length ?? 0,
        agents_low_vitality: lowVitality?.length ?? 0,
        agents_stale_heartbeat_24h: staleHeartbeatAgents?.length ?? 0,
        agents_stale_dream_24h: staleDreamAgents?.length ?? 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("health check", e);
    return new Response(
      JSON.stringify({ ok: false, error: "Health check failed", timestamp: new Date().toISOString() }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
