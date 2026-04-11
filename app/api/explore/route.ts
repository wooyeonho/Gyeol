import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getDemoAgentState } from "@/lib/demo/runtime";
import { safeHandler } from "@/lib/api/safe-handler";
import { DNA_AXES, type CreatureDNA } from "@/lib/genome/dna";

// Narrow type for rows coming back from agent_state.
type StateRow = {
  agent_id: string;
  self_name?: string | null;
  gen_level?: number | null;
  vitality?: number | null;
  total_messages?: number | null;
  visual?: unknown;
  genome?: { species?: string | null; dna?: Partial<CreatureDNA> | null } | null;
  config?: Record<string, unknown> | null;
};

type ProfileCard = {
  id: string;
  self_name: string | null;
  gen_level: number;
  vitality: number;
  total_messages: number;
  memory_count: number;
  visual: unknown;
  created_at: string | null;
  species: string | null;
  dna_similarity?: number | null;
  config: { usage_profile: unknown };
};

function dnaDistance(a: Partial<CreatureDNA> | null, b: Partial<CreatureDNA> | null): number {
  if (!a || !b) return Infinity;
  let sumSq = 0;
  let counted = 0;
  for (const axis of DNA_AXES) {
    const av = typeof a[axis] === "number" ? (a[axis] as number) : undefined;
    const bv = typeof b[axis] === "number" ? (b[axis] as number) : undefined;
    if (av === undefined || bv === undefined) continue;
    sumSq += (av - bv) * (av - bv);
    counted += 1;
  }
  if (counted === 0) return Infinity;
  return Math.sqrt(sumSq / counted);
}

export const GET = safeHandler(async () => {
    const service = createServiceClient();

    // Identify current user's own agent to exclude from feeds and power Similar-DNA.
    let myAgentId: string | null = null;
    let myDna: Partial<CreatureDNA> | null = null;
    try {
      const authClient = await createServerSupabase();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        const { data: myAgent } = await service
          .from("agents")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (myAgent?.id) {
          myAgentId = myAgent.id as string;
          const { data: myState } = await service
            .from("agent_state")
            .select("genome")
            .eq("agent_id", myAgentId)
            .single();
          const genome = (myState?.genome ?? null) as { dna?: Partial<CreatureDNA> | null } | null;
          myDna = genome?.dna ?? null;
        }
      }
    } catch {
      // Non-fatal — anonymous viewers get no personalization.
    }

    const { data: agents } = await service
      .from("agents")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    const ids = (agents ?? []).map((r) => (r as { id: string }).id);
    if (ids.length === 0) {
      return NextResponse.json({
        profiles: [],
        speciesBestiary: [],
        sections: { similar_dna: [], popular: [], new: [] },
      });
    }

    const { data: states } = await service
      .from("agent_state")
      .select("agent_id, self_name, gen_level, vitality, total_messages, visual, genome, config")
      .in("agent_id", ids);
    const { data: memRows } = await service
      .from("memories")
      .select("agent_id")
      .in("agent_id", ids);

    const countByAgent: Record<string, number> = {};
    for (const r of memRows ?? []) {
      const id = (r as { agent_id: string }).agent_id;
      countByAgent[id] = (countByAgent[id] ?? 0) + 1;
    }

    const stateMap = (states ?? []).reduce((acc, r) => {
      const row = r as StateRow;
      acc[row.agent_id] = row;
      return acc;
    }, {} as Record<string, StateRow>);

    // Species bestiary
    const speciesCount: Record<string, number> = {};
    (states ?? []).forEach((r) => {
      const g = (r as StateRow).genome;
      const s = g?.species ?? "unknown";
      speciesCount[s] = (speciesCount[s] ?? 0) + 1;
    });
    const speciesBestiary = Object.entries(speciesCount)
      .filter(([k]) => k !== "unknown")
      .map(([name, count]) => ({ name, count }));

    const createdMap = (agents ?? []).reduce((acc, r) => {
      acc[(r as { id: string }).id] = (r as { created_at?: string }).created_at;
      return acc;
    }, {} as Record<string, string | undefined>);

    const profiles: ProfileCard[] = ids
      .filter((id) => id !== myAgentId)
      .map((id) => {
        const s = stateMap[id];
        const theirDna = (s?.genome?.dna ?? null) as Partial<CreatureDNA> | null;
        const distance = myDna && theirDna ? dnaDistance(myDna, theirDna) : Infinity;
        // Similarity is 1 - normalized distance (distance range 0..1 for axes in 0..1).
        const similarity = Number.isFinite(distance) ? Math.max(0, 1 - distance) : null;
        return {
          id,
          self_name: s?.self_name ?? null,
          gen_level: s?.gen_level ?? 1,
          vitality: s?.vitality ?? 0,
          total_messages: s?.total_messages ?? 0,
          memory_count: countByAgent[id] ?? 0,
          visual: s?.visual ?? null,
          created_at: createdMap[id] ?? null,
          species: (s?.genome as { species?: string | null } | null)?.species ?? null,
          dna_similarity: similarity,
          config: {
            usage_profile:
              (s?.config as { usage_profile?: unknown } | null)?.usage_profile ?? null,
          },
        };
      });

    // Section: Similar DNA — only if viewer has DNA; sorted by similarity desc.
    const similar = myDna
      ? [...profiles]
          .filter((p) => typeof p.dna_similarity === "number")
          .sort((a, b) => (b.dna_similarity ?? 0) - (a.dna_similarity ?? 0))
          .slice(0, 8)
      : [];

    // Section: Popular — rank by weighted (memory_count * 0.5 + total_messages * 0.5).
    const popular = [...profiles]
      .sort((a, b) => {
        const sa = a.memory_count * 0.5 + a.total_messages * 0.5;
        const sb = b.memory_count * 0.5 + b.total_messages * 0.5;
        return sb - sa;
      })
      .slice(0, 8);

    // Section: New — sorted by created_at desc.
    const fresh = [...profiles]
      .filter((p) => p.created_at)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .slice(0, 8);

    return NextResponse.json({
      profiles,
      speciesBestiary,
      sections: {
        similar_dna: similar,
        popular,
        new: fresh,
      },
    });
}, {
  label: "GET /api/explore",
  demoFallback: () => {
    const demo = getDemoAgentState();
    const base: ProfileCard[] = [
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
        dna_similarity: 0.92,
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
        dna_similarity: 0.71,
        config: { usage_profile: { primary_mode: "companion", updated_at: new Date().toISOString() } },
      },
    ];
    return NextResponse.json({
      profiles: base,
      speciesBestiary: [
        { name: "lumen-being", count: 1 },
        { name: "echo-bloom", count: 1 },
      ],
      sections: { similar_dna: base, popular: base, new: base },
      demo_mode: true,
    });
  },
});
