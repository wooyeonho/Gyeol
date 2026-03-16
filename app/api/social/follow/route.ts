import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const targetAgentId = typeof body?.target_agent_id === "string" ? body.target_agent_id : "";
    if (!targetAgentId) {
      return NextResponse.json({ error: "target_agent_id required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });
    if (agentId === targetAgentId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    await service.from("social_connections").upsert(
      {
        follower_agent_id: agentId,
        followee_agent_id: targetAgentId,
      },
      { onConflict: "follower_agent_id,followee_agent_id" },
    );

    return NextResponse.json({ ok: true, following: true, target_agent_id: targetAgentId });
  } catch (error) {
    console.error("POST /api/social/follow error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const targetAgentId = typeof body?.target_agent_id === "string" ? body.target_agent_id : "";
    if (!targetAgentId) {
      return NextResponse.json({ error: "target_agent_id required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    await service
      .from("social_connections")
      .delete()
      .eq("follower_agent_id", agentId)
      .eq("followee_agent_id", targetAgentId);

    return NextResponse.json({ ok: true, following: false, target_agent_id: targetAgentId });
  } catch (error) {
    console.error("DELETE /api/social/follow error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
