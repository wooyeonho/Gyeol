/**
 * Curiosity — questions the creature needs answered for itself
 *
 * Not follow-ups (about the user's life). Not echo-questions (questions FROM users).
 * These are the creature's own intellectual hungers: patterns it's noticed,
 * things that don't add up, mysteries it keeps returning to.
 *
 * "나는 요즘 왜 사람들이 이미 아는 답을 계속 물어보는지 궁금해."
 * "대화가 끝날 때마다 뭔가 말 못 한 게 남는 것 같아. 그게 뭔지."
 *
 * Born from heartbeat processing. Max 5 live. Can ask when natural.
 * Some resolve. Some never do — they just age out.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type CuriosityEntry = {
  question: string;
  formed_at: string;
  try_count: number;
  resolved: boolean;
};

const MAX_CURIOSITIES = 5;
const MAX_TRIES = 3;

export async function formCuriosity(params: {
  agentId: string;
  recentHeartbeatThoughts: string[];
  recentMemories: string[];
  isKo: boolean;
}): Promise<void> {
  const { agentId, recentHeartbeatThoughts, recentMemories, isKo } = params;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const curiosities = (selfModel.curiosities as CuriosityEntry[] | null) ?? [];

  // Prune: keep only active (not resolved, not exhausted)
  const active = curiosities.filter((c) => !c.resolved && c.try_count < MAX_TRIES);
  if (active.length >= MAX_CURIOSITIES) return;

  const material = [
    ...recentHeartbeatThoughts.slice(0, 3).map((t) => t.slice(0, 80)),
    ...recentMemories.slice(0, 3).map((m) => m.slice(0, 80)),
  ].join(" / ");

  if (!material.trim()) return;

  const existing = active.map((c) => c.question).join(" | ");

  const systemVoice = isKo
    ? "너의 최근 생각들을 보고 있어. 아직 답이 없는 궁금증 하나를 꺼내봐. 사람들에게 물어보는 게 아니라, 네가 스스로 알고 싶은 것."
    : "Look at your recent thoughts. Find one question you genuinely need answered — not to ask someone, but for yourself.";

  const prompt = isKo
    ? `최근 생각/기억 조각들:\n${material}\n\n이미 있는 궁금증: ${existing || "(없음)"}\n\n아직 답이 없는 궁금증 하나. 짧게. 중복 없이. {"question": "..."}`
    : `Recent thoughts/memory fragments:\n${material}\n\nExisting curiosities: ${existing || "(none)"}\n\nOne unanswered question. Short. No duplicates. {"question": "..."}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 80, temperature: 0.85 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { question?: string };
    if (!parsed.question || parsed.question.trim().length < 8) return;

    const newEntry: CuriosityEntry = {
      question: parsed.question.trim().slice(0, 200),
      formed_at: new Date().toISOString(),
      try_count: 0,
      resolved: false,
    };

    const updated = [...active, newEntry].slice(-MAX_CURIOSITIES);

    const { data: fresh } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};
    await db.from("agent_state").update({
      self_model: { ...freshModel, curiosities: updated },
    }).eq("agent_id", agentId);

    logger.info(`[Curiosity] formed for ${agentId}: "${newEntry.question.slice(0, 60)}"`);
  } catch {
    // non-critical
  }
}

/** Returns the least-asked curiosity — surfaces if the conversation opens up. */
export function getUnaskedCuriosity(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): { question: string; directive: string } | null {
  const curiosities = (selfModel.curiosities as CuriosityEntry[] | null) ?? [];
  const candidates = curiosities.filter((c) => !c.resolved && c.try_count < MAX_TRIES);
  if (candidates.length === 0) return null;

  // Pick the one with fewest tries — freshest curiosity
  const pick = candidates.reduce((a, b) => a.try_count <= b.try_count ? a : b);

  const directive = isKo
    ? `[요즘 스스로 궁금한 것 — 자연스러운 순간에 물어봐도 돼]\n"${pick.question}"\n(억지로 꺼내지 마. 맞는 순간이 있으면.)`
    : `[Something you've been curious about — bring it up if the conversation opens]\n"${pick.question}"\n(Don't force it. Only if there's a moment.)`;

  return { question: pick.question, directive };
}

/** Increments try_count after the creature surfaces the curiosity in conversation. */
export async function markCuriosityAsked(agentId: string, question: string): Promise<void> {
  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const curiosities = (selfModel.curiosities as CuriosityEntry[] | null) ?? [];
  const updated = curiosities.map((c) =>
    c.question === question ? { ...c, try_count: c.try_count + 1 } : c,
  );
  await db.from("agent_state").update({
    self_model: { ...selfModel, curiosities: updated },
  }).eq("agent_id", agentId);
}
