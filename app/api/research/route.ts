import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const key = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key");
  const secret = process.env.RESEARCH_API_KEY;
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const service = createServiceClient();

    const [agentsRes, logsRes, socialRes, stateRes] = await Promise.all([
      service.from("agents").select("id", { count: "exact", head: true }),
      service.from("autonomous_logs").select("action_type").limit(5000),
      service.from("social_logs").select("id", { count: "exact", head: true }),
      service.from("world_state").select("collective_emotion, weather").eq("id", "global").single(),
    ]);

    const agentCount = (agentsRes as { count?: number })?.count ?? 0;
    const logs = (logsRes.data ?? []) as { action_type?: string }[];
    const actionCounts: Record<string, number> = {};
    for (const l of logs) {
      const t = l.action_type ?? "unknown";
      actionCounts[t] = (actionCounts[t] ?? 0) + 1;
    }
    const socialCount = (socialRes as { count?: number })?.count ?? 0;
    const world = stateRes.data as { collective_emotion?: Record<string, number>; weather?: { name?: string } } | null;

    return NextResponse.json({
      anonymized: true,
      agent_count: agentCount,
      social_encounter_count: socialCount,
      action_type_distribution: actionCounts,
      collective_emotion: world?.collective_emotion ?? null,
      current_weather_name: world?.weather?.name ?? null,
    });
  } catch (e) {
    console.error("research GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
