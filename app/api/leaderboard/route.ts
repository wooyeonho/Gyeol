import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export type LeaderboardEntry = {
  rank: number;
  self_name: string | null;
  gen_level: number;
  vitality: number;
  total_messages: number;
  visual: { color?: string; shape?: string } | null;
  config: { usage_profile?: { primary_mode?: string | null } | null } | null;
};

export type LeaderboardResponse = {
  byLevel: LeaderboardEntry[];
  byMessages: LeaderboardEntry[];
  byVitality: LeaderboardEntry[];
  totalAgents: number;
};

function mapRows(
  rows: Array<{
    self_name?: string | null;
    gen_level?: number | null;
    vitality?: number | null;
    total_messages?: number | null;
    visual?: { color?: string; shape?: string } | null;
    config?: { usage_profile?: { primary_mode?: string | null } | null } | null;
  }>
): LeaderboardEntry[] {
  return rows.map((r, i) => ({
    rank: i + 1,
    self_name: r.self_name ?? null,
    gen_level: r.gen_level ?? 1,
    vitality: r.vitality ?? 1,
    total_messages: r.total_messages ?? 0,
    visual: (r.visual as LeaderboardEntry["visual"]) ?? null,
    config: (r.config as LeaderboardEntry["config"]) ?? null,
  }));
}

export async function GET() {
  try {
    const service = createServiceClient();

    const [byLevel, byMessages, byVitality, countResult] = await Promise.all([
      service
        .from("agent_state")
        .select("self_name, gen_level, vitality, total_messages, visual, config")
        .order("gen_level", { ascending: false })
        .order("total_messages", { ascending: false })
        .limit(20),
      service
        .from("agent_state")
        .select("self_name, gen_level, vitality, total_messages, visual, config")
        .order("total_messages", { ascending: false })
        .limit(20),
      service
        .from("agent_state")
        .select("self_name, gen_level, vitality, total_messages, visual, config")
        .order("vitality", { ascending: false })
        .order("gen_level", { ascending: false })
        .limit(20),
      service.from("agent_state").select("agent_id", { count: "exact", head: true }),
    ]);

    const response: LeaderboardResponse = {
      byLevel: mapRows(byLevel.data ?? []),
      byMessages: mapRows(byMessages.data ?? []),
      byVitality: mapRows(byVitality.data ?? []),
      totalAgents: countResult.count ?? 0,
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("GET /api/leaderboard error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
