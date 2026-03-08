import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function checkCronAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  return Boolean(process.env.CRON_SECRET) && auth === process.env.CRON_SECRET;
}

type WarRow = {
  id?: string;
  side_a?: string[];
  side_b?: string[];
  side_a_score?: number;
  side_b_score?: number;
  ends_at?: string;
  status?: string;
  sides?: { a?: string[]; b?: string[] };
  created_at?: string;
};

function normalizeWar(row: WarRow | null) {
  if (!row) return null;
  const sideA = Array.isArray(row.side_a) ? row.side_a : (Array.isArray(row.sides?.a) ? row.sides.a : []);
  const sideB = Array.isArray(row.side_b) ? row.side_b : (Array.isArray(row.sides?.b) ? row.sides.b : []);
  return {
    id: row.id ?? "active",
    side_a: sideA,
    side_b: sideB,
    side_a_score: Number(row.side_a_score ?? 0),
    side_b_score: Number(row.side_b_score ?? 0),
    ends_at: row.ends_at ?? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: row.status ?? "active",
  };
}

export async function GET() {
  try {
    const service = createServiceClient();
    const { data: row } = await service
      .from("war_events")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json(normalizeWar((row ?? null) as WarRow | null));
  } catch (error) {
    console.error("GET /api/events/war error", error);
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const service = createServiceClient();
    const { data: row } = await service
      .from("war_events")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const normalized = normalizeWar((row ?? null) as WarRow | null);
    if (!normalized) return NextResponse.json({ processed: 0, reason: "no_active_event" });

    const allAgents = [...normalized.side_a, ...normalized.side_b];
    if (allAgents.length === 0) return NextResponse.json({ processed: 0, reason: "empty_sides" });

    const since = (row as WarRow | null)?.created_at ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: artifacts } = await service
      .from("artifacts")
      .select("agent_id")
      .in("agent_id", allAgents)
      .gte("created_at", since);

    let sideAScore = 0;
    let sideBScore = 0;
    for (const artifact of artifacts ?? []) {
      const agentId = (artifact as { agent_id?: string }).agent_id;
      if (!agentId) continue;
      if (normalized.side_a.includes(agentId)) sideAScore += 1;
      else if (normalized.side_b.includes(agentId)) sideBScore += 1;
    }

    await service
      .from("war_events")
      .update({
        side_a_score: sideAScore,
        side_b_score: sideBScore,
        status: new Date(normalized.ends_at).getTime() <= Date.now() ? "ended" : "active",
      })
      .eq("id", normalized.id);

    return NextResponse.json({ processed: 1, side_a_score: sideAScore, side_b_score: sideBScore });
  } catch (error) {
    console.error("POST /api/events/war error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
