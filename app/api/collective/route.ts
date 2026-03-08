import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const [{ data: states }, { data: world }] = await Promise.all([
      service
        .from("agent_state")
        .select("mood, vitality, gen_level, coins, total_messages")
        .limit(1000),
      service.from("world_state").select("*").eq("id", "global").maybeSingle(),
    ]);

    const rows = states ?? [];
    const totalAgents = rows.length;
    const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
    const topMoodsMap = new Map<string, number>();
    for (const row of rows) {
      const mood = typeof row.mood === "string" && row.mood.trim() ? row.mood.trim() : "unknown";
      topMoodsMap.set(mood, (topMoodsMap.get(mood) ?? 0) + 1);
    }
    const topMoods = [...topMoodsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mood, count]) => ({ mood, count }));

    return NextResponse.json({
      collective: {
        total_agents: totalAgents,
        avg_vitality: avg(rows.map((r) => Number(r.vitality ?? 0))),
        avg_gen_level: avg(rows.map((r) => Number(r.gen_level ?? 0))),
        avg_coins: avg(rows.map((r) => Number(r.coins ?? 0))),
        avg_total_messages: avg(rows.map((r) => Number(r.total_messages ?? 0))),
        top_moods: topMoods,
      },
      world_state: world ?? null,
    });
  } catch (error) {
    console.error("GET /api/collective error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
