import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logRouteError } from "@/lib/ops/logger";

export type SpeciesCommunityEntry = {
  species: string;
  member_count: number;
  total_level: number;
  newest_name: string | null;
  icon: string;
};

const SPECIES_ICONS: Record<string, string> = {
  // Fallback icons — the DNA generator names are usually Korean nouns
  // like "여우", "고양이", etc. We only hard-code a handful and fall
  // back to a neutral icon otherwise.
  고양이: "🐱", 여우: "🦊", 강아지: "🐶", 토끼: "🐰", 곰: "🐻",
  새:     "🐦", 호랑이: "🐯", 판다: "🐼", 늑대: "🐺", 펭귄: "🐧",
  수달:   "🦦", 용:   "🐲",
  cat:    "🐱", fox:  "🦊", dog:    "🐶", rabbit: "🐰", bear: "🐻",
  bird:   "🐦", tiger: "🐯", panda:  "🐼", wolf:   "🐺", penguin: "🐧",
  otter:  "🦦", dragon: "🐲",
};

function iconFor(species: string): string {
  return SPECIES_ICONS[species.toLowerCase()] ?? SPECIES_ICONS[species] ?? "✨";
}

/**
 * GET /api/community/species
 *
 * Phase 3-2: Returns one entry per distinct creature species, aggregated
 * across all agents. Used to power the species-community index page.
 * Public — no auth required.
 */
export async function GET() {
  try {
    const service = createServiceClient();

    // Keep the query cheap — we only need the genome + gen_level + name.
    const { data, error } = await service
      .from("agent_state")
      .select("self_name, genome, gen_level, created_at")
      .limit(2000);

    if (error) {
      logRouteError("species community query failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const bySpecies = new Map<
      string,
      { member_count: number; total_level: number; newest_name: string | null; newest_ts: number }
    >();

    for (const row of data ?? []) {
      const genome = row.genome as Record<string, unknown> | null;
      const species = typeof genome?.species === "string" ? (genome.species as string) : null;
      if (!species) continue;
      const bucket = bySpecies.get(species) ?? {
        member_count: 0,
        total_level: 0,
        newest_name: null,
        newest_ts: 0,
      };
      bucket.member_count += 1;
      bucket.total_level += (row.gen_level as number | null) ?? 1;
      const ts = row.created_at ? new Date(row.created_at as string).getTime() : 0;
      if (ts > bucket.newest_ts) {
        bucket.newest_ts = ts;
        bucket.newest_name = (row.self_name as string | null) ?? null;
      }
      bySpecies.set(species, bucket);
    }

    const entries: SpeciesCommunityEntry[] = Array.from(bySpecies.entries())
      .map(([species, bucket]) => ({
        species,
        member_count: bucket.member_count,
        total_level: bucket.total_level,
        newest_name: bucket.newest_name,
        icon: iconFor(species),
      }))
      .sort((a, b) => b.member_count - a.member_count)
      .slice(0, 30);

    return NextResponse.json({ entries });
  } catch (e) {
    logRouteError("GET /api/community/species error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
