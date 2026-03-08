import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ iot_preferences: {} });

    const { data: state } = await service.from("agent_state").select("iot_preferences").eq("agent_id", agentId).single();
    const prefs = (state as { iot_preferences?: Record<string, unknown> } | null)?.iot_preferences ?? {};
    return NextResponse.json({ iot_preferences: prefs });
  } catch (e) {
    console.error("iot GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const prefs = body && typeof body === "object" ? body : {};

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    await service.from("agent_state").update({ iot_preferences: prefs }).eq("agent_id", agentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("iot POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
