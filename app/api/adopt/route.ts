import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { getPrimaryAgent } from "@/lib/agents/primary";

export async function GET() {
  try {
    const service = createServiceClient();
    const { data: rows } = await service.from("adoption_board").select("agent_id, created_at").eq("status", "available");
    const agentIds = (rows ?? []).map((r) => (r as { agent_id: string }).agent_id);
    if (agentIds.length === 0) return NextResponse.json({ list: [] });

    const { data: states } = await service.from("agent_state").select("agent_id, self_name, vitality, visual, genome").in("agent_id", agentIds);
    const { data: mems } = await service.from("memories").select("agent_id").in("agent_id", agentIds);
    const countByAgent: Record<string, number> = {};
    (mems ?? []).forEach((r) => {
      const id = (r as { agent_id: string }).agent_id;
      countByAgent[id] = (countByAgent[id] ?? 0) + 1;
    });
    const stateMap = (states ?? []).reduce((acc, r) => {
      acc[(r as { agent_id: string }).agent_id] = r;
      return acc;
    }, {} as Record<string, { self_name?: string; vitality?: number; visual?: unknown; genome?: { species?: string | null } }>);
    const { data: agents } = await service.from("agents").select("id, created_at").in("id", agentIds);
    const createdMap = (agents ?? []).reduce((acc, r) => {
      acc[(r as { id: string }).id] = (r as { created_at?: string }).created_at;
      return acc;
    }, {} as Record<string, string | undefined>);

    const list = agentIds.map((id) => {
      const s = stateMap[id];
      const created = createdMap[id];
      const days = created ? Math.floor((Date.now() - new Date(created).getTime()) / (24 * 60 * 60 * 1000)) : 0;
      return {
        agent_id: id,
        self_name: s?.self_name ?? null,
        vitality: s?.vitality ?? 0,
        memory_count: countByAgent[id] ?? 0,
        days_alive: days,
        visual: s?.visual ?? null,
        species: (s?.genome as { species?: string | null } | undefined)?.species ?? null,
      };
    });
    return NextResponse.json({ list });
  } catch (e) {
    console.error("GET /api/adopt error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const agentId = body?.agent_id;
    if (!agentId) return NextResponse.json({ error: "agent_id required" }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const service = createServiceClient();
    const { agentId: currentPrimaryAgentId } = await getPrimaryAgent(service, user.id);
    if (currentPrimaryAgentId) {
      return NextResponse.json(
        { error: "현재는 단일 메인 에이전트만 지원합니다. 입양은 멀티 에이전트 지원 이후 다시 열립니다." },
        { status: 409 }
      );
    }
    const { data: claimed, error: claimError } = await service
      .from("adoption_board")
      .update({ status: "adopted" })
      .eq("agent_id", agentId)
      .eq("status", "available")
      .select("id")
      .maybeSingle();
    if (claimError || !claimed?.id) return NextResponse.json({ error: "Not available" }, { status: 409 });

    const { error: adoptError } = await service.from("agents").update({ user_id: user.id }).eq("id", agentId);
    if (adoptError) {
      await service.from("adoption_board").update({ status: "available" }).eq("id", claimed.id);
      return NextResponse.json({ error: "Adoption failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/adopt error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
