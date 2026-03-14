import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { getDemoAgentState } from "@/lib/demo/runtime";
import { isMissingEnvError } from "@/lib/env/required";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId: myAgentId } = await ensurePrimaryAgent(service, user.id);
    if (!myAgentId) {
      return NextResponse.json({ socialLogs: [], breedingRecords: [], otherAgents: [] });
    }

    const [logsRes, breedingRes, agentsRes, giftRes, selfStateRes] = await Promise.all([
      service.from("social_logs").select("id, agent_a_id, agent_b_id, topic, conversation, message, outcome, created_at").or(`agent_a_id.eq.${myAgentId},agent_b_id.eq.${myAgentId}`).order("created_at", { ascending: false }).limit(30),
      service.from("breeding_records").select("id, parent_a, parent_b, child_id, status, traits_blend, created_at, updated_at").or(`parent_a.eq.${myAgentId},parent_b.eq.${myAgentId}`).order("created_at", { ascending: false }).limit(20),
      service.from("agents").select("id").neq("user_id", user.id).limit(50),
      service.from("autonomous_logs").select("id, summary, created_at").eq("agent_id", myAgentId).eq("action_type", "gift_exchange").order("created_at", { ascending: false }).limit(20),
      service.from("agent_state").select("self_name, visual, genome, config, self_model, gen_level, vitality, mood").eq("agent_id", myAgentId).single(),
    ]);

    const otherIds = (agentsRes.data ?? []).map((r) => (r as { id: string }).id);
    let otherAgents: { id: string; self_name: string | null; gen_level: number; memory_count: number; visual?: unknown; genome?: unknown; config?: unknown; self_model?: unknown }[] = [];
    if (otherIds.length > 0) {
      const { data: states } = await service.from("agent_state").select("agent_id, self_name, gen_level, visual, genome, config, self_model").in("agent_id", otherIds);
      const { data: counts } = await service.from("memories").select("agent_id").in("agent_id", otherIds);
      const countByAgent = (counts ?? []).reduce((acc, r) => {
        const aid = (r as { agent_id: string }).agent_id;
        acc[aid] = (acc[aid] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const stateByAgent = (states ?? []).reduce((acc, r) => {
        acc[(r as { agent_id: string }).agent_id] = r as { agent_id: string; self_name: string | null; gen_level: number; visual?: unknown; genome?: unknown; config?: unknown; self_model?: unknown };
        return acc;
      }, {} as Record<string, { agent_id: string; self_name: string | null; gen_level: number; visual?: unknown; genome?: unknown; config?: unknown; self_model?: unknown }>);
      otherAgents = otherIds.map((id) => ({
        id,
        self_name: stateByAgent[id]?.self_name ?? null,
        gen_level: stateByAgent[id]?.gen_level ?? 1,
        memory_count: countByAgent[id] ?? 0,
        visual: stateByAgent[id]?.visual,
        genome: stateByAgent[id]?.genome ?? null,
        config: {
          usage_profile: (stateByAgent[id]?.config as { usage_profile?: unknown } | undefined)?.usage_profile ?? null,
        },
        self_model: stateByAgent[id]?.self_model ?? null,
      }));

      const myPrimaryMode = (selfStateRes.data?.config as { usage_profile?: { primary_mode?: string } } | undefined)?.usage_profile?.primary_mode;
      otherAgents.sort((a, b) => {
        const aMode = (a.config as { usage_profile?: { primary_mode?: string } } | undefined)?.usage_profile?.primary_mode;
        const bMode = (b.config as { usage_profile?: { primary_mode?: string } } | undefined)?.usage_profile?.primary_mode;

        let aScore = 0;
        let bScore = 0;

        if (myPrimaryMode) {
          if (aMode === myPrimaryMode) aScore += 100;
          if (bMode === myPrimaryMode) bScore += 100;
        }

        aScore += Math.min(a.memory_count, 50);
        bScore += Math.min(b.memory_count, 50);

        return bScore - aScore;
      });
      otherAgents = otherAgents.slice(0, 30);
    }

    const socialLogs = (logsRes.data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      agent_a_id: (r as { agent_a_id: string }).agent_a_id,
      agent_b_id: (r as { agent_b_id: string }).agent_b_id,
      topic: (r as { topic?: string }).topic,
      conversation: (r as { conversation?: string }).conversation,
      message: (r as { message?: string }).message,
      outcome: (r as { outcome?: string }).outcome,
      content:
        (r as { conversation?: string; message?: string; outcome?: string }).conversation ||
        (r as { message?: string; outcome?: string }).message ||
        (r as { outcome?: string }).outcome ||
        "",
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
    const selfState = selfStateRes.data as {
      self_name?: string | null;
      visual?: unknown;
      genome?: unknown;
      config?: { usage_profile?: unknown } | null;
      self_model?: unknown;
      gen_level?: number | null;
      vitality?: number | null;
      mood?: string | null;
    } | null;

    return NextResponse.json({
      socialLogs,
      breedingRecords,
      otherAgents,
      giftExchanges,
      selfAgent: selfState
        ? {
            self_name: selfState.self_name ?? null,
            visual: selfState.visual ?? null,
            genome: selfState.genome ?? null,
            config: { usage_profile: selfState.config?.usage_profile ?? null },
            self_model: selfState.self_model ?? null,
            gen_level: selfState.gen_level ?? 1,
            vitality: selfState.vitality ?? 1,
            mood: selfState.mood ?? null,
          }
        : null,
    });
  } catch (e) {
    console.error("GET /api/social error", e);
    if (isMissingEnvError(e)) {
      const demo = getDemoAgentState();
      return NextResponse.json({
        socialLogs: [
          {
            id: "demo-social-1",
            topic: "Shared glow",
            conversation: "We compared how each of us remembers light and loneliness.",
            created_at: new Date().toISOString(),
          },
        ],
        breedingRecords: [],
        otherAgents: [
          {
            id: "demo-other-1",
            self_name: "Morrow",
            gen_level: 2,
            memory_count: 18,
            visual: { ...(demo.visual as Record<string, unknown>), color: "#f9a8d4" },
            genome: { species: "echo-bloom" },
            config: { usage_profile: { primary_mode: "social", updated_at: new Date().toISOString() } },
            self_model: { current_role: "listener" },
          },
        ],
        giftExchanges: [
          {
            id: "demo-gift-1",
            summary: "Exchanged a small memory shard as a greeting.",
            created_at: new Date().toISOString(),
          },
        ],
        selfAgent: {
          self_name: demo.self_name,
          visual: demo.visual,
          genome: demo.genome,
          config: { usage_profile: (demo.config as { usage_profile?: unknown })?.usage_profile ?? null },
          self_model: demo.self_model,
          gen_level: demo.gen_level,
          vitality: demo.vitality,
          mood: demo.mood,
        },
        demo_mode: true,
      });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
