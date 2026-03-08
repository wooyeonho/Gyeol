import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type RankingRow = {
  agent_id: string;
  self_name: string | null;
  gen_level: number;
  vitality: number;
  total_messages: number;
  intimacy_score: number;
  coins: number;
};

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sort = req.nextUrl.searchParams.get("sort") ?? "gen_level";
  const validSorts = ["gen_level", "vitality", "total_messages", "intimacy_score", "coins"];
  const sortField = validSorts.includes(sort) ? sort : "gen_level";

  const service = createServiceClient();
  const { data, error } = await service
    .from("agent_state")
    .select("agent_id, self_name, gen_level, vitality, total_messages, intimacy_score, coins")
    .gt("vitality", 0.05)
    .order(sortField, { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const rankings = ((data || []) as RankingRow[]).map((r, i) => ({
    rank: i + 1,
    agent_id: r.agent_id,
    self_name: r.self_name || "이름 없음",
    gen_level: r.gen_level || 1,
    vitality: r.vitality || 0,
    total_messages: r.total_messages || 0,
    intimacy_score: r.intimacy_score || 0,
    coins: r.coins || 0,
    score: (r.gen_level || 1) * 100 + (r.vitality || 0) * 50 + Math.min(50, (r.total_messages || 0) / 10),
  }));

  return NextResponse.json({ rankings, sort: sortField });
}
