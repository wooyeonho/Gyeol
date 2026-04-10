import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getMoodEmoji, type DiaryEntry } from "@/lib/diary/creature-diary";
import type { StoryMood } from "@/lib/social/creature-stories";
import { logger } from "@/lib/logger";

/**
 * GET /api/diary — Get diary entries for a creature.
 * Query params: agentId, month (YYYY-MM, optional)
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

  const month = url.searchParams.get("month"); // YYYY-MM

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

// ---------------------------------------------------------------------------
// Valid story moods (matching creature_stories CHECK constraint)
// ---------------------------------------------------------------------------

const VALID_STORY_MOODS = new Set<StoryMood>([
  "happy", "sad", "excited", "calm", "anxious",
  "playful", "curious", "tired", "neutral",
]);

function toStoryMood(mood: string): StoryMood {
  if (VALID_STORY_MOODS.has(mood as StoryMood)) return mood as StoryMood;
  // Map common diary moods to story moods
  const mapping: Record<string, StoryMood> = {
    joyful: "happy", loving: "happy", grateful: "happy", proud: "happy",
    inspired: "excited", mischievous: "playful", energetic: "excited",
    thoughtful: "calm", dreamy: "calm", focused: "calm", peaceful: "calm",
    tender: "calm", shy: "calm",
    melancholy: "sad", lonely: "sad", frustrated: "sad",
    angry: "anxious", scared: "anxious", confused: "anxious",
    surprised: "curious", bored: "tired", sleepy: "tired",
  };
  return mapping[mood] ?? "neutral";
}

/**
 * POST /api/diary — Create a new diary entry for a creature.
 * Body: { agentId, summary, mood }
 *
 * After successfully creating the diary entry, a creature story is
 * auto-published as a fire-and-forget side effect.
 */
export async function POST(req: Request) {
  const authClient = await createServerSupabase();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { agentId, summary, mood } = body as {
    agentId?: string;
    summary?: string;
    mood?: string;
  };

  if (!agentId || !summary) {
    return NextResponse.json({ error: "agentId and summary are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify ownership
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("user_id", user.id)
    .single();
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const derivedMood = mood || "neutral";

  // Insert diary entry into autonomous_logs
  const { data: inserted, error } = await supabase
    .from("autonomous_logs")
    .insert({
      agent_id: agentId,
      action_type: "diary",
      summary,
      mood: derivedMood,
    })
    .select("id, summary, mood, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create diary entry" },
      { status: 500 },
    );
  }

  // Fetch creature name for the story
  const { data: stateRow } = await supabase
    .from("agent_state")
    .select("self_name")
    .eq("agent_id", agentId)
    .single();
  const creatureName = (stateRow?.self_name as string) || "Unknown";

  // Fire-and-forget: auto-publish diary entry as a creature story
  void supabase
    .from("creature_stories")
    .insert({
      agent_id: agentId,
      creature_name: creatureName,
      content: summary.slice(0, 200),
      mood: toStoryMood(derivedMood),
    })
    .then(({ error: storyErr }) => {
      if (storyErr) {
        logger.error("[Diary] Failed to auto-publish creature story", {
          agentId,
          error: storyErr.message,
        });
      }
    });

  const entry: DiaryEntry = {
    id: inserted.id,
    date: inserted.created_at.slice(0, 10),
    mood: inserted.mood ?? "neutral",
    moodEmoji: getMoodEmoji(inserted.mood ?? "neutral"),
    summary: inserted.summary ?? "",
    createdAt: inserted.created_at,
  };

  return NextResponse.json({ entry }, { status: 201 });
}
