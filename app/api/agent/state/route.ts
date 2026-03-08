import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    let agentId = agents?.[0]?.id;
    if (!agentId) {
      const { data: newAgent } = await service.from("agents").insert({ user_id: user.id }).select("id").single();
      agentId = newAgent?.id;
      if (agentId) {
        await service.from("agent_state").insert({
          agent_id: agentId,
          total_messages: 0,
          intimacy_score: 0,
          vitality: 1,
          progress: 0,
          gen_level: 1,
          coins: 50,
        });
      }
    }
    if (!agentId) {
      return NextResponse.json({ agentId: null, agentState: null });
    }
    const { data: state } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
    return NextResponse.json({ agentId, agentState: state ?? null });
  } catch (e) {
    console.error("GET /api/agent/state error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
