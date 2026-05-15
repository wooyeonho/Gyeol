/**
 * Residue — emotional texture that lingers after conversations
 *
 * Each conversation leaves something behind. Not the content — the feeling.
 * Like how a room still smells like someone who left.
 *
 * "이전 대화에서 뭔가 따뜻한 게 남아 있어. 왜 그런지는 몰라."
 * "그 대화가 끝났는데도 뭔가 무거운 게 아직 있어."
 *
 * Not mood (which is per-turn). Residue is the texture that bridges conversations.
 * Fades naturally — 6h for light conversations, up to 36h for intense ones.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type ConversationResidue = {
  texture: string;    // 3-5 words: "warm and a little sad" / "unsettled, alive"
  intensity: number;  // 0-1
  from_at: string;    // when this conversation ended
  expires_at: string; // when residue fades
};

function computeExpiresAt(intensity: number): string {
  const hours = 6 + intensity * 30; // 6h (low) to 36h (intense)
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

/** Called after each emotionally significant conversation. */
export async function captureResidue(params: {
  agentId: string;
  message: string;
  reply: string;
  emotionalBoost: number;
  isKo: boolean;
}): Promise<void> {
  const { agentId, message, reply, emotionalBoost, isKo } = params;

  if (emotionalBoost < 6) return;

  const intensity = Math.min(1, emotionalBoost / 20);
  const excerpt = `${message.slice(0, 100)} / ${reply.slice(0, 100)}`;

  const systemVoice = isKo
    ? "이 대화가 끝났어. 어떤 감정의 질감이 남아 있어? 내용 말고 느낌. 3-5 단어로."
    : "This conversation just ended. What emotional texture remains? Not the content — the feeling. 3-5 words.";

  const prompt = isKo
    ? `대화 조각:\n${excerpt}\n\n남은 감정의 질감. 짧게. {"texture": "..."}`
    : `Conversation excerpt:\n${excerpt}\n\nThe emotional residue. Brief. {"texture": "..."}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 40, temperature: 0.8 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { texture?: string };
    if (!parsed.texture || parsed.texture.trim().length < 3) return;

    const residue: ConversationResidue = {
      texture: parsed.texture.trim().slice(0, 80),
      intensity,
      from_at: new Date().toISOString(),
      expires_at: computeExpiresAt(intensity),
    };

    const db = createServiceClient();
    const { data: fresh } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};
    await db.from("agent_state").update({
      self_model: { ...freshModel, residue },
    }).eq("agent_id", agentId);

    logger.info(`[Residue] captured for ${agentId}: "${residue.texture}" (intensity: ${intensity.toFixed(2)})`);
  } catch {
    // non-critical
  }
}

/** Returns arrival fragment if residue is still active. */
export function getResidueFragment(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): string | null {
  const residue = selfModel.residue as ConversationResidue | null;
  if (!residue) return null;
  if (new Date(residue.expires_at).getTime() < Date.now()) return null;
  if (residue.intensity < 0.2) return null;

  return isKo
    ? `[이전 대화의 잔향 — "${residue.texture}"] 그 느낌이 아직 조금 남아 있어. 이유는 몰라도.`
    : `[Residue from the last conversation — "${residue.texture}"] Something of that still lingers. Hard to say why.`;
}
