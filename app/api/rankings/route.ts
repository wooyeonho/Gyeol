import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const { data: rows } = await service
      .from("agent_state")
      .select("agent_id, self_name, gen_level, vitality, coins, total_messages")
      .limit(500);
    const rankings = (rows ?? [])
      .map((row) => {
        const gen = Number(row.gen_level ?? 1);
        const vitality = Number(row.vitality ?? 0);
        const coins = Number(row.coins ?? 0);
        const messages = Number(row.total_messages ?? 0);
        const score = gen * 100 + vitality * 100 + Math.min(500, coins) * 0.4 + Math.min(1000, messages) * 0.2;
        return {
          agent_id: row.agent_id,
          self_name: row.self_name ?? "...",
          gen_level: gen,
          vitality,
          coins,
          total_messages: messages,
          score: Math.round(score),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    return NextResponse.json({ rankings });
  } catch (e) {
    console.error("rankings GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
