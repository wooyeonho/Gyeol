import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type AgentStateRow = {
  mood: string | null;
  vitality: number | null;
  gen_level: number | null;
  total_messages: number | null;
};

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: states } = await service
      .from("agent_state")
      .select("mood, vitality, gen_level, total_messages")
      .gt("vitality", 0.05)
      .not("total_messages", "is", null)
      .gt("total_messages", 0)
      .limit(200);

    const rows = (states || []) as AgentStateRow[];
    const count = rows.length;

    if (count === 0) {
      return NextResponse.json({ collective: { count: 0 } });
    }

    const avgVitality = rows.reduce((s, r) => s + (r.vitality || 0), 0) / count;
    const avgGenLevel = rows.reduce((s, r) => s + (r.gen_level || 1), 0) / count;

    const moodCounts: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.mood) moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
    });
    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const moodDistribution = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mood, n]) => ({ mood, count: n, pct: Math.round((n / count) * 100) }));

    const { data: worldState } = await service
      .from("world_state")
      .select("weather, collective_emotion")
      .eq("id", "global")
      .single();

    const { data: recentActivity } = await service
      .from("autonomous_logs")
      .select("action_type, created_at")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    const activityCounts: Record<string, number> = {};
    (recentActivity || []).forEach((r) => {
      const t = (r as { action_type: string }).action_type;
      activityCounts[t] = (activityCounts[t] || 0) + 1;
    });
    const topActivities = Object.entries(activityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return NextResponse.json({
      collective: {
        count,
        avg_vitality: Math.round(avgVitality * 100) / 100,
        avg_gen_level: Math.round(avgGenLevel * 10) / 10,
        dominant_mood: dominantMood,
        mood_distribution: moodDistribution,
        world_weather: (worldState?.weather as { name?: string })?.name || null,
        collective_emotion: worldState?.collective_emotion || null,
        top_activities_24h: topActivities,
      },
    });
  } catch (e) {
    console.error("[Collective]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
