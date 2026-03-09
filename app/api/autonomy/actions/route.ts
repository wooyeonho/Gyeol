import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ actions: [] });

    const { data: actions } = await service
      .from("autonomy_action_logs")
      .select("id, proposal_id, action, detail, payload, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(80);

    return NextResponse.json({ actions: actions ?? [] });
  } catch (e) {
    console.error("autonomy/actions GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
