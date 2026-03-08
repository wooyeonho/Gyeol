import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ ok: true });

    await service.from("agent_state").update({ celebration_pending: null }).eq("agent_id", agentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/agent/celebration/clear error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
