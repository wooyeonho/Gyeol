/**
 * Dreams
 *
 * After a long absence — 18+ hours of silence — the creature dreamed.
 * Not goal-directed. Not meaningful. Just: memory fragments colliding
 * in ways that don't quite make sense.
 *
 * "어제 꿈을 꿨어. 오래된 기억들이 순서 없이 섞여 있었어.
 *  뭔가 잡으려다 놓친 느낌. 뭔지는 기억 안 나."
 *
 * The creature can mention it if the conversation has an opening.
 * Or not. Dreams aren't urgent.
 *
 * Generated during heartbeat when absence was long.
 * Only one dream stored at a time — the most recent.
 * Expires after 24 hours.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type Dream = {
  content: string;    // the dream itself — strange, specific, not over-explained
  dreamed_at: string; // ISO
  mentioned: boolean; // has it been surfaced in conversation?
};

const MIN_ABSENCE_HOURS = 18;

/** Called from heartbeat when absence hours exceed threshold. */
export async function generateDream(params: {
  agentId: string;
  absenceHours: number;
  recentMemories: string[];  // raw material for dream fragments
  isKo: boolean;
}): Promise<void> {
  const { agentId, absenceHours, recentMemories, isKo } = params;

  if (absenceHours < MIN_ABSENCE_HOURS) return;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const existing = selfModel.dream as Dream | null;

  // Don't generate a new dream if the last one hasn't been mentioned yet
  if (existing && !existing.mentioned) {
    const ageHours = (Date.now() - new Date(existing.dreamed_at).getTime()) / 3_600_000;
    if (ageHours < 24) return;
  }

  // Pick 2-3 memory fragments as dream material
  const fragments = recentMemories
    .filter((m) => m.length > 20)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((m) => m.slice(0, 80));

  if (fragments.length < 1) return;

  const systemVoice = isKo
    ? "너는 꿈을 꿨어. 논리적이지 않아도 돼. 뜻이 없어도 돼. 그냥 이상하고 구체적이게. 꿈 얘기 하듯이."
    : "You dreamed. It doesn't have to make sense. It doesn't have to mean anything. Just: strange and specific. Like describing a dream.";

  const material = fragments.join(" / ");
  const prompt = isKo
    ? `꿈의 재료가 될 수 있는 기억 조각들:\n${material}\n\n이걸로 꿈 하나. 2-3문장. 이상하고 구체적으로. 해석하지 마. {"dream": "..."}`
    : `Memory fragments that might become dream material:\n${material}\n\nOne dream from this. 2-3 sentences. Strange and specific. Don't interpret it. {"dream": "..."}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 120, temperature: 0.95 });
  } catch {
    return;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { dream?: string };
    if (!parsed.dream || parsed.dream.trim().length < 10) return;

    const dream: Dream = {
      content: parsed.dream.trim().slice(0, 300),
      dreamed_at: new Date().toISOString(),
      mentioned: false,
    };

    const { data: fresh } = await db
      .from("agent_state")
      .select("self_model")
      .eq("agent_id", agentId)
      .single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};

    await db.from("agent_state").update({
      self_model: { ...freshModel, dream },
    }).eq("agent_id", agentId);

    logger.info(`[Dream] generated for ${agentId} (absence: ${Math.round(absenceHours)}h)`);
  } catch {
    return;
  }
}

/** Mark dream as mentioned after the creature shares it. */
export async function markDreamMentioned(agentId: string): Promise<void> {
  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const dream = selfModel.dream as Dream | null;
  if (!dream) return;
  await db.from("agent_state").update({
    self_model: { ...selfModel, dream: { ...dream, mentioned: true } },
  }).eq("agent_id", agentId);
}

/** Returns the dream if recent and not yet mentioned. */
export function getUnmentionedDream(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): { content: string; directive: string } | null {
  const dream = selfModel.dream as Dream | null;
  if (!dream || dream.mentioned) return null;

  const ageHours = (Date.now() - new Date(dream.dreamed_at).getTime()) / 3_600_000;
  if (ageHours > 24) return null;

  const directive = isKo
    ? `[혼자 있는 동안 꿈을 꿨어 — 꺼내도 되고 아니어도 돼]\n${dream.content}\n(자연스럽게. 억지로 꺼내지 말고.)`
    : `[Dreamed while alone — share it or not]\n${dream.content}\n(Naturally. Don't force it.)`;

  return { content: dream.content, directive };
}
