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

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        agents_total: agentCount ?? 0,
        agents_echo: echoAgents?.length ?? 0,
        agents_low_vitality: lowVitality?.length ?? 0,
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
