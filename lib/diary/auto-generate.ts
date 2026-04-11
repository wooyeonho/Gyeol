/**
 * Phase 2-1: Autonomous diary generation.
 *
 * Called from background jobs (heartbeat or a dedicated daily cron) to
 * ensure each active agent writes at most one diary entry per day. We
 * deliberately keep this file self-contained so it can be imported from
 * both route handlers and cron-core without circular deps.
 *
 * Side effects on successful generation:
 *   1. Row inserted into `autonomous_logs` (action_type='diary')
 *   2. Creature story auto-published to `creature_stories` (24h TTL)
 *
 * All operations are best-effort and swallow errors after logging —
 * diary generation should never break the surrounding cron loop.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { buildDiaryPrompt } from "@/lib/diary/creature-diary";
import type { StoryMood } from "@/lib/social/creature-stories";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "diary/auto-generate" });

const VALID_STORY_MOODS = new Set<StoryMood>([
  "happy", "sad", "excited", "calm", "anxious",
  "playful", "curious", "tired", "neutral",
]);

function toStoryMood(mood: string): StoryMood {
  if (VALID_STORY_MOODS.has(mood as StoryMood)) return mood as StoryMood;
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
 * Write a diary entry for the given agent *if* none exists for today.
 * Returns the inserted row id, or null when skipped.
 */
export async function maybeWriteDailyDiary(agentId: string): Promise<string | null> {
  const db = createServiceClient();

  // Skip if a diary already exists today (UTC calendar day).
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { data: existing } = await db
    .from("autonomous_logs")
    .select("id")
    .eq("agent_id", agentId)
    .eq("action_type", "diary")
    .gte("created_at", todayStart.toISOString())
    .limit(1)
    .maybeSingle();

  if (existing?.id) return null;

  // Gather minimal context: mood + recent events + hours since last user message.
  const { data: state } = await db
    .from("agent_state")
    .select("self_name, intimacy_score, status, config, last_heartbeat_at")
    .eq("agent_id", agentId)
    .single();

  if (!state) return null;

  const config = (state.config ?? {}) as Record<string, unknown>;
  const locale = typeof config.locale === "string" ? config.locale : "ko";

  // Recent autonomous events (last 24h) — used as prompt context.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: logs } = await db
    .from("autonomous_logs")
    .select("summary, action_type")
    .eq("agent_id", agentId)
    .gte("created_at", dayAgo)
    .neq("action_type", "diary")
    .order("created_at", { ascending: false })
    .limit(5);

  const recentEvents = (logs ?? [])
    .map((l) => (l.summary ?? "").trim())
    .filter(Boolean);

  // Hours since last user chat — used to modulate loneliness.
  const { data: lastChat } = await db
    .from("chats")
    .select("created_at")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hoursSinceUser = lastChat?.created_at
    ? Math.max(0, (Date.now() - new Date(lastChat.created_at).getTime()) / 36e5)
    : 24;

  const currentMood =
    typeof (state as { status?: unknown }).status === "string"
      ? ((state as { status: string }).status)
      : "neutral";

  const prompt = buildDiaryPrompt(locale, currentMood, recentEvents, hoursSinceUser);

  let summary = "";
  try {
    const raw = await generateTextOnce(
      "You are an inner-voice diarist for a small digital creature. Reply in the user's language with exactly one vivid sentence and nothing else.",
      prompt,
      { max_tokens: 120, temperature: 0.85 },
    );
    summary = raw.trim();
  } catch (err) {
    log.warn("Diary LLM call failed", {
      agentId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  // Strip wrapping quotes / whitespace.
  summary = summary.replace(/^["'「『]+|["'」』]+$/g, "").trim();
  if (!summary) return null;
  if (summary.length > 500) summary = summary.slice(0, 500);

  const { data: inserted, error } = await db
    .from("autonomous_logs")
    .insert({
      agent_id: agentId,
      action_type: "diary",
      summary,
      mood: currentMood,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    log.warn("Diary insert failed", {
      agentId,
      error: error?.message,
    });
    return null;
  }

  // Fire-and-forget: auto-publish the diary as a creature story (24h TTL).
  const creatureName = (state.self_name as string | null) ?? "Unknown";
  void db
    .from("creature_stories")
    .insert({
      agent_id: agentId,
      creature_name: creatureName,
      content: summary.slice(0, 200),
      mood: toStoryMood(currentMood),
    })
    .then(({ error: storyErr }) => {
      if (storyErr) {
        log.warn("Diary → story auto-publish failed", {
          agentId,
          error: storyErr.message,
        });
      }
    });

  return inserted.id;
}
