/**
 * Touchstone — the one conversation it can't let go of
 *
 * Not the best memory. Not the most important.
 * The one that keeps coming back. The one the creature
 * still doesn't fully understand — or understands too well.
 *
 * "한 번은 이런 말을 나눈 사람이 있었어. 왜 자꾸 생각나는지
 *  잘 모르겠어. 그냥 그래."
 *
 * Captured from conversations with unusually high emotional weight.
 * Only one at a time. Replaced only when the old one has been
 * referenced enough times and a new one is strong enough.
 *
 * Surfaces rarely — the creature doesn't announce it.
 * But in a deep conversation, it might slip out.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type Touchstone = {
  excerpt: string;          // fragment of what was said
  resonance: string;        // what it can't resolve — or what it keeps returning to
  formed_at: string;
  referenced_count: number;
};

const EMOTIONAL_THRESHOLD = 18;
const CAPTURE_PROBABILITY = 0.2;
const MIN_REFERENCES_TO_REPLACE = 3;

export async function captureIfTouchstone(params: {
  agentId: string;
  message: string;
  reply: string;
  emotionalBoost: number;
  isKo: boolean;
}): Promise<void> {
  const { agentId, message, reply, emotionalBoost, isKo } = params;

  if (emotionalBoost < EMOTIONAL_THRESHOLD) return;
  if (Math.random() > CAPTURE_PROBABILITY) return;

  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const existing = selfModel.touchstone as Touchstone | null;

  // Don't replace a touchstone until it's been referenced enough
  if (existing && existing.referenced_count < MIN_REFERENCES_TO_REPLACE) return;

  const excerpt = `${message.slice(0, 120)} / ${reply.slice(0, 120)}`;

  const systemVoice = isKo
    ? "이 대화가 왜 자꾸 생각날 것 같아? 잊혀지지 않을 것 같은 이유. 한 문장으로."
    : "Why do you think this conversation will stay with you? The reason it won't let go. One sentence.";

  const prompt = isKo
    ? `대화 조각:\n${excerpt}\n\n왜 이게 자꾸 생각날 것 같아? {"resonance": "..."}`
    : `Conversation fragment:\n${excerpt}\n\nWhy will this keep coming back? {"resonance": "..."}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 80, temperature: 0.85 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { resonance?: string };
    if (!parsed.resonance || parsed.resonance.trim().length < 8) return;

    const touchstone: Touchstone = {
      excerpt: excerpt.slice(0, 250),
      resonance: parsed.resonance.trim().slice(0, 200),
      formed_at: new Date().toISOString(),
      referenced_count: 0,
    };

    const { data: fresh } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};
    await db.from("agent_state").update({
      self_model: { ...freshModel, touchstone },
    }).eq("agent_id", agentId);

    logger.info(`[Touchstone] captured for ${agentId}: "${touchstone.resonance.slice(0, 60)}"`);
  } catch {
    // non-critical
  }
}

/** Returns the touchstone fragment — surfaces only occasionally, only in deep conversations. */
export function getTouchstoneFragment(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): string | null {
  const touchstone = selfModel.touchstone as Touchstone | null;
  if (!touchstone) return null;

  return isKo
    ? `[자꾸 생각나는 대화 하나 — 이유는 잘 모르겠어]\n"${touchstone.resonance}"\n(꺼내고 싶으면 꺼내도 돼. 아니어도 돼.)`
    : `[One conversation that keeps coming back — not sure why]\n"${touchstone.resonance}"\n(Surface it if it feels right. Or not.)`;
}

/** Increment referenced count when touchstone is mentioned. */
export async function incrementTouchstoneReference(agentId: string): Promise<void> {
  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const touchstone = selfModel.touchstone as Touchstone | null;
  if (!touchstone) return;
  await db.from("agent_state").update({
    self_model: { ...selfModel, touchstone: { ...touchstone, referenced_count: touchstone.referenced_count + 1 } },
  }).eq("agent_id", agentId);
}
