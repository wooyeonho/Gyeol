import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const { data: states } = await service
      .from("agent_state")
      .select("mood, vitality, gen_level")
      .limit(1000);
    const moodDist = (states ?? []).reduce((acc, row) => {
      const mood = (row.mood ?? "unknown") as string;
      acc[mood] = (acc[mood] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const total = states?.length ?? 0;
    const avgVitality = total > 0
      ? (states ?? []).reduce((sum, row) => sum + Number(row.vitality ?? 0), 0) / total
      : 0;
    const avgGenLevel = total > 0
      ? (states ?? []).reduce((sum, row) => sum + Number(row.gen_level ?? 1), 0) / total
      : 1;

    const normalizedMood = Object.entries(moodDist).reduce((acc, [key, count]) => {
      acc[key] = total > 0 ? count / total : 0;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      collective: {
        total_agents: total,
        mood_distribution: normalizedMood,
        avg_vitality: Number(avgVitality.toFixed(3)),
        avg_gen_level: Number(avgGenLevel.toFixed(2)),
      },
    });
  } catch (e) {
    console.error("collective GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
