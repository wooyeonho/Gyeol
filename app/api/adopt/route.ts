import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { getPrimaryAgent } from "@/lib/agents/primary";
import { parseBody, adoptBodySchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const service = createServiceClient();
    const { data: rows } = await service.from("adoption_board").select("agent_id, created_at").eq("status", "available");
    const agentIds = (rows ?? []).map((r) => (r as { agent_id: string }).agent_id);
    if (agentIds.length === 0) return NextResponse.json({ list: [] });

    const { data: states } = await service.from("agent_state").select("agent_id, self_name, vitality, visual, genome, config").in("agent_id", agentIds);
    const { data: memRows } = await service.from("memories").select("agent_id").in("agent_id", agentIds);
    const countByAgent: Record<string, number> = {};
    for (const r of memRows ?? []) {
      const id = (r as { agent_id: string }).agent_id;
      countByAgent[id] = (countByAgent[id] ?? 0) + 1;
    }
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
        config: {
          usage_profile: ((s as { config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } } | undefined)?.config?.usage_profile) ?? null,
        },
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
    const parsed = await parseBody(request, adoptBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const agentId = parsed.data.agent_id;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const service = createServiceClient();
    const { agentId: currentPrimaryAgentId } = await getPrimaryAgent(service, user.id);
    if (currentPrimaryAgentId) {
      return NextResponse.json(
        { error: "Adoption is not yet available. It will be enabled after multi-agent support." },
        { status: 409 }
      );
    }
    // Atomic adoption: claim board entry + transfer agent in a single DB transaction.
    // Falls back to two-step approach if RPC not deployed yet.
    const { data: adopted, error: rpcError } = await service.rpc("adopt_agent", {
      p_agent_id: agentId,
      p_new_user_id: user.id,
    });

    if (rpcError) {
      // Fallback: two-step with manual rollback (legacy path)
      console.warn("[Adopt] atomic RPC unavailable, using legacy path:", rpcError.message);
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
    } else if (!adopted) {
      return NextResponse.json({ error: "Not available" }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/adopt error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
