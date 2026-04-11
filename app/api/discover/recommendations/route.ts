import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logRouteError } from "@/lib/ops/logger";

export type DiscoverCreature = {
  agent_id: string;
  name: string;
  species: string | null;
  gen_level: number;
  intimacy: number;
  total_messages: number;
  created_at: string | null;
};

export type DiscoverRecommendations = {
  popular: DiscoverCreature[];
  newborn: DiscoverCreature[];
  similar: DiscoverCreature[];
};

const LIMIT = 6;

type StateRow = {
  agent_id: string;
  self_name: string | null;
  genome: Record<string, unknown> | null;
  gen_level: number | null;
  intimacy_score: number | null;
  total_messages: number | null;
  created_at: string | null;
};

function toCreature(row: StateRow): DiscoverCreature {
  const species =
    typeof row.genome?.species === "string" ? (row.genome.species as string) : null;
  return {
    agent_id: row.agent_id,
    name: row.self_name ?? "이름 없음",
    species,
    gen_level: row.gen_level ?? 1,
    intimacy: row.intimacy_score ?? 0,
    total_messages: row.total_messages ?? 0,
    created_at: row.created_at,
  };
}

/**
 * GET /api/discover/recommendations
 *
 * Phase 3-1: returns three bite-sized creature lists for the Discover
 * feed header — "popular" (by total messages), "newborn" (recently
 * created), and "similar" (shares the caller's primary species if the
 * caller has an agent; otherwise mirrors the popular list).
 *
 * Uses agent_state rows directly so the data is always live. Public —
 * readable without auth so anonymous visitors can still browse.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const service = createServiceClient();

    // Resolve the caller's own species (for the "similar" bucket).
    let mySpecies: string | null = null;
    let myAgentId: string | null = null;
    if (user) {
      const { data: myAgents } = await service
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      myAgentId = myAgents?.[0]?.id ?? null;
      if (myAgentId) {
        const { data: myState } = await service
          .from("agent_state")
          .select("genome")
          .eq("agent_id", myAgentId)
          .maybeSingle();
        const g = (myState?.genome ?? null) as Record<string, unknown> | null;
        mySpecies = typeof g?.species === "string" ? (g.species as string) : null;
      }
    }

    // Popular — by total_messages descending.
    const { data: popularRows } = await service
      .from("agent_state")
      .select("agent_id, self_name, genome, gen_level, intimacy_score, total_messages, created_at")
      .order("total_messages", { ascending: false })
      .limit(LIMIT + (myAgentId ? 1 : 0));

    // Newborn — by created_at descending.
    const { data: newbornRows } = await service
      .from("agent_state")
      .select("agent_id, self_name, genome, gen_level, intimacy_score, total_messages, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMIT + (myAgentId ? 1 : 0));

    // Similar — species match if we know it, else fall back to popular.
    let similarRows: StateRow[] = [];
    if (mySpecies) {
      const { data } = await service
        .from("agent_state")
        .select("agent_id, self_name, genome, gen_level, intimacy_score, total_messages, created_at")
        .filter("genome->>species", "eq", mySpecies)
        .order("intimacy_score", { ascending: false })
        .limit(LIMIT + 1);
      similarRows = (data ?? []) as StateRow[];
    }

    const dropSelf = (rows: StateRow[]) =>
      (myAgentId ? rows.filter((r) => r.agent_id !== myAgentId) : rows).slice(0, LIMIT);

    return NextResponse.json<DiscoverRecommendations>({
      popular: dropSelf((popularRows ?? []) as StateRow[]).map(toCreature),
      newborn: dropSelf((newbornRows ?? []) as StateRow[]).map(toCreature),
      similar: dropSelf(similarRows).map(toCreature),
    });
  } catch (e) {
    logRouteError("GET /api/discover/recommendations", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
