import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getMoodEmoji, type DiaryEntry } from "@/lib/diary/creature-diary";

/**
 * GET /api/diary — Get diary entries for a creature.
 * Query params: agentId, month (YYYY-MM, optional)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const month = url.searchParams.get("month"); // YYYY-MM
  const supabase = createServiceClient();

  let query = supabase
    .from("autonomous_logs")
    .select("id, summary, mood, created_at")
    .eq("agent_id", agentId)
    .eq("action_type", "diary")
    .order("created_at", { ascending: false })
    .limit(60);

  if (month) {
    const start = `${month}-01T00:00:00Z`;
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + 1);
    query = query.gte("created_at", start).lt("created_at", endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries: DiaryEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    date: row.created_at.slice(0, 10),
    mood: row.mood ?? "neutral",
    moodEmoji: getMoodEmoji(row.mood ?? "neutral"),
    summary: row.summary ?? "",
    createdAt: row.created_at,
  }));

  return NextResponse.json({ entries });
}
