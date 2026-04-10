import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/wrapped
 * Aggregates the user's annual statistics for the Wrapped page.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01T00:00:00Z`;
  const yearEnd = `${year + 1}-01-01T00:00:00Z`;

  // Run queries in parallel
  const [
    { count: totalMessages },
    { data: memories },
    { data: agent },
    { data: emotionRows },
  ] = await Promise.all([
    // Total chat messages this year
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", yearStart)
      .lt("created_at", yearEnd),

    // Memories this year
    supabase
      .from("memories")
      .select("emotion, importance, created_at")
      .eq("user_id", user.id)
      .gte("created_at", yearStart)
      .lt("created_at", yearEnd),

    // Agent info (level, streak, species, evolution_count)
    supabase
      .from("agents")
      .select("level, streak_days, species, custom_name, evolution_count, created_at")
      .eq("user_id", user.id)
      .maybeSingle(),

    // Emotion distribution (all memories with emotions)
    supabase
      .from("memories")
      .select("emotion")
      .eq("user_id", user.id)
      .not("emotion", "is", null)
      .gte("created_at", yearStart)
      .lt("created_at", yearEnd),
  ]);

  // Compute emotion distribution
  const emotionCounts: Record<string, number> = {};
  for (const row of (emotionRows ?? [])) {
    if (row.emotion) {
      emotionCounts[row.emotion] = (emotionCounts[row.emotion] ?? 0) + 1;
    }
  }
  const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
  const topEmotions = Object.entries(emotionCounts)
    .map(([emotion, count]) => ({
      emotion,
      count,
      percent: totalEmotions > 0 ? Math.round((count / totalEmotions) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Core memory count (importance >= 8)
  const coreMemoryCount = (memories ?? []).filter((m) => (m.importance ?? 0) >= 8).length;

  return NextResponse.json({
    year,
    totalMessages: totalMessages ?? 0,
    totalMemories: (memories ?? []).length,
    coreMemories: coreMemoryCount,
    topEmotions,
    agent: agent
      ? {
          name: agent.custom_name ?? "크리처",
          level: agent.level ?? 1,
          streakDays: agent.streak_days ?? 0,
          species: agent.species ?? "creature",
          evolutionCount: agent.evolution_count ?? 0,
        }
      : null,
  });
}
