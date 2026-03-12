import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").limit(30);
    const ids = (agents ?? []).map((r) => (r as { id: string }).id);
    if (ids.length === 0) return NextResponse.json({ profiles: [], rankings: null });

    const { data: states } = await service.from("agent_state").select("agent_id, self_name, gen_level, vitality, total_messages, visual, genome, config").in("agent_id", ids);
    const { data: memCounts } = await service.from("memories").select("agent_id").in("agent_id", ids);
    const countByAgent: Record<string, number> = {};
    (memCounts ?? []).forEach((r) => {
      const id = (r as { agent_id: string }).agent_id;
      countByAgent[id] = (countByAgent[id] ?? 0) + 1;
    });
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

    const profiles = ids.map((id) => {
      const s = stateMap[id];
      const created = (agents ?? []).find((a) => (a as { id: string }).id === id);
      return {
        id,
        self_name: s?.self_name ?? null,
        gen_level: s?.gen_level ?? 1,
        vitality: s?.vitality ?? 0,
        total_messages: s?.total_messages ?? 0,
        memory_count: countByAgent[id] ?? 0,
        visual: s?.visual ?? null,
        created_at: (created as { created_at?: string } | undefined)?.created_at ?? null,
        species: (s?.genome as { species?: string | null })?.species ?? null,
        config: {
          usage_profile: (s?.config as { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | undefined)?.usage_profile ?? null,
        },
      };
    });

    return NextResponse.json({ profiles, speciesBestiary });
  } catch (e) {
    console.error("GET /api/explore error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
