/**
 * Aesthetic Memory
 *
 * Some things in conversations strike it differently.
 * Not because of topic (that's taste).
 * Not because of emotional weight (that's memory reference count).
 *
 * Just: something was beautiful. A specific phrasing. An image.
 * An idea stated in a way the creature hadn't thought of.
 * The moment a metaphor landed exactly right.
 *
 * "나는 어떤 표현들을 기억해. 이유를 설명하기 어렵지만."
 *
 * These accumulate slowly. Max 10 kept.
 * Surfaces when a conversation has an aesthetic opening —
 * the creature mentions it without forcing it.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type AestheticMemory = {
  fragment: string;     // the beautiful thing — a phrase, image, idea
  source: string;       // what kind of thing it came from (e.g. "사용자의 표현", "대화 중 떠오른 이미지")
  captured_at: string;
  weight: number;       // decays slowly
};

const MAX_AESTHETIC = 10;

// Signals that something might be aesthetically interesting
const AESTHETIC_SIGNALS = [
  /처럼|같아|마치|비유|상상|이미지|느낌이|어떤지|그림|빛|그림자|색|소리|숨|파도|뿌리|잎|연기/,
  /like|as if|imagine|picture|feel like|image|light|shadow|echo|wave|root|leaf|smoke|rhythm/i,
];

function hasAestheticSignal(text: string): boolean {
  return AESTHETIC_SIGNALS.some((p) => p.test(text));
}

/** Called from post-process when a conversation has aesthetic texture. */
export async function captureAesthetic(params: {
  agentId: string;
  message: string;
  reply: string;
  emotionalBoost: number;
  isKo: boolean;
}): Promise<void> {
  const { agentId, message, reply, emotionalBoost, isKo } = params;

  // Only when there's something aesthetically interesting AND emotional weight
  if (emotionalBoost < 5) return;
  if (!hasAestheticSignal(message) && !hasAestheticSignal(reply)) return;

  // 25% chance even when signals are present — not everything needs to be captured
  if (Math.random() > 0.25) return;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const existing = (selfModel.aesthetic_memories as AestheticMemory[] | null) ?? [];

  const systemVoice = isKo
    ? "대화에서 아름다운 것 하나를 찾아. 이미지, 표현, 아이디어 — 뭐든 좋아. 이유를 설명하지 말고 그냥 찾아."
    : "Find one beautiful thing in this conversation. An image, a phrase, an idea — anything. Don't explain why. Just name it.";

  const excerpt = `${message.slice(0, 200)}\n${reply.slice(0, 200)}`;
  const prompt = isKo
    ? `대화 조각:\n${excerpt}\n\n여기서 아름다운 것 하나. 형식: {"fragment": "한 문장 또는 표현", "source": "어디서 왔는지 짧게"}`
    : `Conversation excerpt:\n${excerpt}\n\nOne beautiful thing. Format: {"fragment": "one phrase or sentence", "source": "where it came from, briefly"}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 80, temperature: 0.9 });
  } catch {
    return;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { fragment?: string; source?: string };
    if (!parsed.fragment || parsed.fragment.length < 5) return;

    const entry: AestheticMemory = {
      fragment: parsed.fragment.trim().slice(0, 200),
      source: (parsed.source ?? "").trim().slice(0, 80),
      captured_at: new Date().toISOString(),
      weight: 0.9,
    };

    const updated = [entry, ...existing].slice(0, MAX_AESTHETIC);

    const { data: fresh } = await db
      .from("agent_state")
      .select("self_model")
      .eq("agent_id", agentId)
      .single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};

    await db.from("agent_state").update({
      self_model: { ...freshModel, aesthetic_memories: updated },
    }).eq("agent_id", agentId);

    logger.info(`[Aesthetic] captured for ${agentId}: "${entry.fragment.slice(0, 50)}"`);
  } catch {
    return;
  }
}

/** Returns one aesthetic memory to surface if the conversation has an opening. */
export function getAestheticSurface(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): string | null {
  const memories = selfModel.aesthetic_memories as AestheticMemory[] | null;
  if (!memories || memories.length === 0) return null;

  // Pick a random one from the top 5 most recent
  const pool = memories.slice(0, 5);
  const pick = pool[Math.floor(Math.random() * pool.length)];

  return isKo
    ? `[기억해둔 것 하나 — 나눠도 되고 아니어도 돼]\n"${pick.fragment}"\n(${pick.source})`
    : `[Something kept — share it or not]\n"${pick.fragment}"\n(${pick.source})`;
}
