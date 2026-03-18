import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { getDemoAgentState } from "@/lib/demo/runtime";
import { safeHandler } from "@/lib/api/safe-handler";

export const GET = safeHandler(async () => {
    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").limit(30);
    const ids = (agents ?? []).map((r) => (r as { id: string }).id);
    if (ids.length === 0) return NextResponse.json({ profiles: [], rankings: null });

    const { data: states } = await service.from("agent_state").select("agent_id, self_name, gen_level, vitality, total_messages, visual, genome, config").in("agent_id", ids);
    const { data: memRows } = await service.from("memories").select("agent_id").in("agent_id", ids);
    const countByAgent: Record<string, number> = {};
    for (const r of memRows ?? []) {
      const id = (r as { agent_id: string }).agent_id;
      countByAgent[id] = (countByAgent[id] ?? 0) + 1;
    }
    const stateMap = (states ?? []).reduce((acc, r) => {
      acc[(r as { agent_id: string }).agent_id] = r;
      return acc;
    }, {} as Record<string, { agent_id: string; self_name?: string; gen_level?: number; vitality?: number; total_messages?: number; visual?: unknown; genome?: { species?: string | null }; config?: unknown }>);

    const speciesCount: Record<string, number> = {};
    (states ?? []).forEach((r) => {
      const g = (r as { genome?: { species?: string | null } }).genome;
      const s = g?.species ?? "unknown";
      speciesCount[s] = (speciesCount[s] ?? 0) + 1;
    });
    const speciesBestiary = Object.entries(speciesCount).filter(([k]) => k !== "unknown").map(([name, count]) => ({ name, count }));

    const createdMap = (agents ?? []).reduce((acc, r) => {
      acc[(r as { id: string }).id] = (r as { created_at?: string }).created_at;
      return acc;
    }, {} as Record<string, string | undefined>);

    const profiles = ids.map((id) => {
      const s = stateMap[id];
      return {
        id,
        self_name: s?.self_name ?? null,
        gen_level: s?.gen_level ?? 1,
        vitality: s?.vitality ?? 0,
        total_messages: s?.total_messages ?? 0,
        memory_count: countByAgent[id] ?? 0,
        visual: s?.visual ?? null,
        created_at: createdMap[id] ?? null,
        species: (s?.genome as { species?: string | null })?.species ?? null,
        config: {
          usage_profile: (s?.config as { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | undefined)?.usage_profile ?? null,
        },
      };
    });

    return NextResponse.json({ profiles, speciesBestiary });
}, {
  label: "GET /api/explore",
  demoFallback: () => {
    const demo = getDemoAgentState();
    return NextResponse.json({
      profiles: [
        {
          id: "demo-1",
          self_name: "Luma",
          gen_level: 3,
          vitality: 0.82,
          total_messages: 34,
          memory_count: 34,
          visual: demo.visual,
          created_at: new Date().toISOString(),
          species: "lumen-being",
          config: { usage_profile: (demo.config as { usage_profile?: unknown })?.usage_profile ?? null },
        },
        {
          id: "demo-2",
          self_name: "Morrow",
          gen_level: 2,
          vitality: 0.64,
          total_messages: 21,
          memory_count: 21,
          visual: { ...(demo.visual as Record<string, unknown>), color: "#f9a8d4" },
          created_at: new Date().toISOString(),
          species: "echo-bloom",
          config: { usage_profile: { primary_mode: "companion", updated_at: new Date().toISOString() } },
        },
      ],
      speciesBestiary: [
        { name: "lumen-being", count: 1 },
        { name: "echo-bloom", count: 1 },
      ],
      demo_mode: true,
    });
  },
});
