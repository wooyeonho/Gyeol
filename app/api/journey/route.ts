import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  groupByDate,
  prepareRadarChartData,
  getDominantMood,
  DEFAULT_TIMELINE_DAYS,
  type MemoryTimelineEntry,
} from "@/lib/memory/analysis";

/**
 * GET /api/journey — Memory analysis dashboard data.
 * Returns: DNA radar chart, memory timeline, trait history, weekly summary.
 */
export async function GET(req: Request) {
  const authClient = await createServerSupabase();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: ownership } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("user_id", user.id)
    .single();
  if (!ownership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const days = parseInt(url.searchParams.get("days") ?? String(DEFAULT_TIMELINE_DAYS), 10);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Parallel data fetching
  const [stateRes, logsRes, chatsRes, memoriesRes] = await Promise.all([
    supabase
      .from("agent_state")
      .select("config, mood")
      .eq("agent_id", agentId)
      .single(),
    supabase
      .from("autonomous_logs")
      .select("id, action_type, summary, mood, created_at")
      .eq("agent_id", agentId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("chats")
      .select("id, role, created_at")
      .eq("agent_id", agentId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("memories")
      .select("id, content, created_at")
      .eq("agent_id", agentId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const config = (stateRes.data?.config ?? {}) as Record<string, unknown>;
  const genome = config.genome as Record<string, unknown> | undefined;
  const currentDNA = (genome?.dna ?? {}) as Record<string, number>;

  // Build timeline entries
  const timeline: MemoryTimelineEntry[] = [];

  // Autonomous logs → timeline
  for (const log of logsRes.data ?? []) {
    const typeMap: Record<string, MemoryTimelineEntry["type"]> = {
      autonomous_output: "chat",
      dream_journal: "dream",
      social_encounter: "social",
      evolution: "evolution",
      trait_emerged: "trait",
      diary: "diary",
    };
    timeline.push({
      id: log.id,
      date: log.created_at,
      type: typeMap[log.action_type] ?? "chat",
      summary: log.summary ?? "",
      mood: log.mood ?? null,
    });
  }

  // Chat counts per day
  const chatDays = new Map<string, number>();
  for (const chat of chatsRes.data ?? []) {
    if (chat.role === "user") {
      const day = chat.created_at.slice(0, 10);
      chatDays.set(day, (chatDays.get(day) ?? 0) + 1);
    }
  }

  // DNA radar chart
  const radarData = prepareRadarChartData(currentDNA);

  // Mood distribution
  const moods = (logsRes.data ?? []).map((l) => l.mood).filter(Boolean) as string[];
  const dominantMood = getDominantMood(moods);

  // Group timeline by date
  const grouped = groupByDate(timeline);

  // Trait history from autonomous_logs
  const traitLogs = (logsRes.data ?? []).filter((l) => l.action_type === "trait_emerged");

  // Stats
  const totalMessages = chatsRes.data?.length ?? 0;
  const totalMemories = memoriesRes.data?.length ?? 0;
  const totalDreams = (logsRes.data ?? []).filter((l) => l.action_type === "dream_journal").length;

  return NextResponse.json({
    radarData,
    timeline: timeline.slice(0, 100),
    groupedByDate: Object.fromEntries(grouped),
    chatActivity: Object.fromEntries(chatDays),
    dominantMood,
    traitHistory: traitLogs.map((l) => ({
      summary: l.summary,
      date: l.created_at,
    })),
    stats: { totalMessages, totalMemories, totalDreams, days },
  });
}
