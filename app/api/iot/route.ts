import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      preferences?: unknown;
      sensor_event?: unknown;
    };
    const prefs = (typeof body.preferences === "object" && body.preferences !== null ? body.preferences : {}) as Record<string, unknown>;
    const sensorEvent = (typeof body.sensor_event === "object" && body.sensor_event !== null ? body.sensor_event : null) as Record<string, unknown> | null;

    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).limit(1).maybeSingle();
    const myAgentId = myAgent?.id;
    if (!myAgentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: state } = await service.from("agent_state").select("iot_preferences").eq("agent_id", myAgentId).single();
    const current = (state?.iot_preferences as Record<string, unknown> | null) ?? {};
    const merged = { ...current, ...prefs, updated_at: new Date().toISOString() };
    await service.from("agent_state").update({ iot_preferences: merged }).eq("agent_id", myAgentId);

    if (sensorEvent) {
      const compactEvent = JSON.stringify(sensorEvent).slice(0, 500);
      await service.from("autonomous_logs").insert({
        agent_id: myAgentId,
        action_type: "iot_event",
        summary: `IoT sensor event: ${compactEvent}`,
      });
    }

    return NextResponse.json({ ok: true, iot_preferences: merged });
  } catch (error) {
    console.error("POST /api/iot error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).limit(1).maybeSingle();
    const myAgentId = myAgent?.id;
    if (!myAgentId) return NextResponse.json({ iot_preferences: {} });

    const { data: state } = await service.from("agent_state").select("iot_preferences").eq("agent_id", myAgentId).single();
    return NextResponse.json({ iot_preferences: state?.iot_preferences ?? {} });
  } catch (error) {
    console.error("GET /api/iot error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
