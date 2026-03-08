import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: myAgents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const myAgentId = myAgents?.[0]?.id;
    if (!myAgentId) {
      return NextResponse.json({ socialLogs: [], breedingRecords: [], otherAgents: [] });
    }

    const [logsRes, breedingRes, agentsRes, giftRes] = await Promise.all([
      service.from("social_logs").select("id, agent_a_id, agent_b_id, topic, outcome, created_at").or(`agent_a_id.eq.${myAgentId},agent_b_id.eq.${myAgentId}`).order("created_at", { ascending: false }).limit(30),
      service.from("breeding_records").select("id, parent_a, parent_b, child_id, status, traits_blend, created_at, updated_at").or(`parent_a.eq.${myAgentId},parent_b.eq.${myAgentId}`).order("created_at", { ascending: false }).limit(20),
      service.from("agents").select("id").neq("user_id", user.id).limit(50),
      service.from("autonomous_logs").select("id, summary, created_at").eq("agent_id", myAgentId).eq("action_type", "gift_exchange").order("created_at", { ascending: false }).limit(20),
    ]);

    const otherIds = (agentsRes.data ?? []).map((r) => (r as { id: string }).id);
    let otherAgents: { id: string; self_name: string | null; gen_level: number; memory_count: number; visual?: unknown }[] = [];
    if (otherIds.length > 0) {
      const { data: states } = await service.from("agent_state").select("agent_id, self_name, gen_level, visual").in("agent_id", otherIds);
      const { data: counts } = await service.from("memories").select("agent_id").in("agent_id", otherIds);
      const countByAgent = (counts ?? []).reduce((acc, r) => {
        const aid = (r as { agent_id: string }).agent_id;
        acc[aid] = (acc[aid] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const stateByAgent = (states ?? []).reduce((acc, r) => {
        acc[(r as { agent_id: string }).agent_id] = r as { agent_id: string; self_name: string | null; gen_level: number; visual?: unknown };
        return acc;
      }, {} as Record<string, { agent_id: string; self_name: string | null; gen_level: number; visual?: unknown }>);
      otherAgents = otherIds.map((id) => ({
        id,
        self_name: stateByAgent[id]?.self_name ?? null,
        gen_level: stateByAgent[id]?.gen_level ?? 1,
        memory_count: countByAgent[id] ?? 0,
        visual: stateByAgent[id]?.visual,
      }));
    }

    const socialLogs = (logsRes.data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      agent_a_id: (r as { agent_a_id: string }).agent_a_id,
      agent_b_id: (r as { agent_b_id: string }).agent_b_id,
      topic: (r as { topic?: string }).topic,
      outcome: (r as { outcome?: string }).outcome,
      created_at: (r as { created_at?: string }).created_at,
    }));

    const breedingRecords = (breedingRes.data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      parent_a: (r as { parent_a: string }).parent_a,
      parent_b: (r as { parent_b: string }).parent_b,
      child_id: (r as { child_id?: string }).child_id,
      status: (r as { status?: string }).status,
      traits_blend: (r as { traits_blend?: unknown }).traits_blend,
      created_at: (r as { created_at?: string }).created_at,
      updated_at: (r as { updated_at?: string }).updated_at,
    }));

    const giftExchanges = (giftRes.data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      summary: (r as { summary?: string }).summary,
      created_at: (r as { created_at?: string }).created_at,
    }));
    return NextResponse.json({ socialLogs, breedingRecords, otherAgents, giftExchanges });
  } catch (e) {
    console.error("GET /api/social error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
