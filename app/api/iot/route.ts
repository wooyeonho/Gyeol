import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`iot:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    const preferences = typeof body?.preferences === "object" && body?.preferences
      ? body.preferences
      : null;
    if (!preferences) return NextResponse.json({ error: "preferences object required" }, { status: 400 });

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { error } = await service
      .from("agent_state")
      .update({ iot_preferences: preferences })
      .eq("agent_id", agent.id);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    return NextResponse.json({ ok: true, preferences });
  } catch (e) {
    console.error("iot POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ preferences: {} });
    const { data: state } = await service.from("agent_state").select("iot_preferences").eq("agent_id", agent.id).single();
    return NextResponse.json({ preferences: state?.iot_preferences ?? {} });
  } catch (e) {
    console.error("iot GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
