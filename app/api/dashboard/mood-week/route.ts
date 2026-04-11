import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/dashboard/mood-week" });

export type MoodBucket = "positive" | "neutral" | "negative";

export type MoodDay = {
  date: string; // YYYY-MM-DD
  dominant_mood: string | null;
  bucket: MoodBucket | null;
  score: number; // -2 .. +2
  entry_count: number;
  sample_summary: string | null;
};

export type MoodWeekResponse = {
  agent_id: string;
  days: MoodDay[]; // Most recent 14 days, oldest first
  weekly_average: number;
  weekly_label: string;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  intimacy: number | null;
  dominant_moods: Array<{ mood: string; count: number }>;
};

// Map every mood we know about to a score in [-2, +2] and a coarse bucket.
// This lives here (not in creature-diary.ts) so it stays a server-only
// computation — the client receives pre-rolled buckets.
const MOOD_SCORE: Record<string, number> = {
  joyful: 2, excited: 2, loving: 2, proud: 2, inspired: 2, grateful: 2,
  happy: 2, playful: 1, energetic: 1, mischievous: 1, curious: 1,
  peaceful: 1, tender: 1, dreamy: 1, focused: 1,
  calm: 1, thoughtful: 0, shy: 0, surprised: 0, neutral: 0, bored: 0,
  tired: -1, sleepy: -1, confused: -1, anxious: -1,
  melancholy: -1, sad: -1, scared: -1, frustrated: -1, lonely: -1,
  jealous: -1, angry: -2,
};

function bucketFor(score: number): MoodBucket {
  if (score >= 1) return "positive";
  if (score <= -1) return "negative";
  return "neutral";
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    const { data: agent } = await service
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!agent?.id) {
      return NextResponse.json({ error: "No agent" }, { status: 404 });
    }

    const { data: state } = await service
      .from("agent_state")
      .select("intimacy_score")
      .eq("agent_id", agent.id)
      .maybeSingle();

    // Pull 14 days of logs that carry a mood field (diary + autonomous).
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    since.setUTCHours(0, 0, 0, 0);

    const { data: logs } = await service
      .from("autonomous_logs")
      .select("created_at, mood, summary, action_type")
      .eq("agent_id", agent.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    // Bucket into calendar days.
    type Acc = {
      scores: number[];
      moods: string[];
      sample: string | null;
      count: number;
    };
    const byDay = new Map<string, Acc>();
    for (const row of logs ?? []) {
      const rawDate = (row.created_at as string | null) ?? "";
      const day = rawDate.slice(0, 10);
      if (!day) continue;
      const mood = (row.mood as string | null) ?? "neutral";
      const score = MOOD_SCORE[mood] ?? 0;
      const acc = byDay.get(day) ?? { scores: [], moods: [], sample: null, count: 0 };
      acc.scores.push(score);
      acc.moods.push(mood);
      acc.count += 1;
      if (!acc.sample && row.action_type === "diary" && typeof row.summary === "string") {
        acc.sample = row.summary;
      }
      byDay.set(day, acc);
    }

    // Emit last 14 calendar days (oldest → newest) so the client can
    // render a fixed-width graph without having to deal with gaps.
    const days: MoodDay[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const acc = byDay.get(key);
      if (!acc) {
        days.push({
          date: key,
          dominant_mood: null,
          bucket: null,
          score: 0,
          entry_count: 0,
          sample_summary: null,
        });
        continue;
      }
      const avg = acc.scores.reduce((a, b) => a + b, 0) / acc.scores.length;
      // Pick the most frequent mood of the day for display.
      const moodCounts: Record<string, number> = {};
      for (const m of acc.moods) moodCounts[m] = (moodCounts[m] ?? 0) + 1;
      const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      days.push({
        date: key,
        dominant_mood: dominant,
        bucket: bucketFor(avg),
        score: Math.round(avg * 100) / 100,
        entry_count: acc.count,
        sample_summary: acc.sample,
      });
    }

    // Weekly rollup (last 7 observed days with at least one entry).
    const observed = days.filter((d) => d.entry_count > 0);
    const last7 = observed.slice(-7);
    const weeklyAvg =
      last7.length > 0
        ? last7.reduce((sum, d) => sum + d.score, 0) / last7.length
        : 0;

    let weeklyLabel = "neutral";
    if (weeklyAvg >= 1.25) weeklyLabel = "radiant";
    else if (weeklyAvg >= 0.5) weeklyLabel = "bright";
    else if (weeklyAvg <= -1.25) weeklyLabel = "heavy";
    else if (weeklyAvg <= -0.5) weeklyLabel = "dim";

    const positiveCount = days.filter((d) => d.bucket === "positive").length;
    const negativeCount = days.filter((d) => d.bucket === "negative").length;
    const neutralCount = days.filter((d) => d.bucket === "neutral").length;

    // Top dominant moods across the whole window.
    const moodTotals: Record<string, number> = {};
    for (const d of days) {
      if (d.dominant_mood) {
        moodTotals[d.dominant_mood] = (moodTotals[d.dominant_mood] ?? 0) + 1;
      }
    }
    const dominantMoods = Object.entries(moodTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mood, count]) => ({ mood, count }));

    const response: MoodWeekResponse = {
      agent_id: agent.id,
      days,
      weekly_average: Math.round(weeklyAvg * 100) / 100,
      weekly_label: weeklyLabel,
      positive_count: positiveCount,
      negative_count: negativeCount,
      neutral_count: neutralCount,
      intimacy: (state?.intimacy_score as number | null) ?? null,
      dominant_moods: dominantMoods,
    };

    return NextResponse.json(response);
  } catch (e) {
    log.error("GET /api/dashboard/mood-week error", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
