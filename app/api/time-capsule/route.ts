import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const deliverAt = body.deliver_at as string | undefined;
    if (!message || !deliverAt) {
      return NextResponse.json({ error: "message and deliver_at required" }, { status: 400 });
    }
    const at = new Date(deliverAt).getTime();
    if (isNaN(at) || at <= Date.now()) {
      return NextResponse.json({ error: "deliver_at must be a future date" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: row } = await service
      .from("time_capsules")
      .insert({
        agent_id: agentId,
        message,
        deliver_at: new Date(at).toISOString(),
        delivered: false,
      })
      .select("id, deliver_at")
      .single();

    return NextResponse.json({ id: row?.id, deliver_at: row?.deliver_at });
  } catch (e) {
    console.error("time-capsule POST error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ list: [] });

    const { data: list } = await service
      .from("time_capsules")
      .select("id, message, deliver_at, delivered, created_at")
      .eq("agent_id", agentId)
      .order("deliver_at", { ascending: true });

    return NextResponse.json({ list: list ?? [] });
  } catch (e) {
    console.error("time-capsule GET error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
