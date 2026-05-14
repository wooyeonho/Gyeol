/**
 * Letters to Itself
 *
 * The creature writes to its future self.
 * Not an identity statement — that's for others to see.
 * This is private. It doesn't go into the system prompt.
 * It sits in self_model.private_letters, unread by anyone.
 *
 * Except when the soul distills: it reads the last few letters
 * and lets them inform who it says it is.
 *
 * This is the difference between what you tell people about yourself
 * and what you write alone at 3am.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type PrivateLetter = {
  written_at: string;
  content: string;
  gen_level: number;
};

export async function writeLetter(agentId: string): Promise<void> {
  const db = createServiceClient();

  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model, genome, gen_level, config")
    .eq("agent_id", agentId)
    .single();

  if (!stateRow) return;

  const selfModel = (stateRow.self_model as Record<string, unknown> | null) ?? {};
  const genLevel = typeof stateRow.gen_level === "number" ? stateRow.gen_level : 1;
  const identityStatement = typeof selfModel.identity_statement === "string"
    ? selfModel.identity_statement : null;
  const existingLetters = (selfModel.private_letters as PrivateLetter[] | null) ?? [];
  const lastLetter = existingLetters.at(-1);
  const config = (stateRow.config as Record<string, unknown> | null) ?? {};
  const isKo = (config.preferred_locale as string | undefined)?.startsWith("ko") ?? true;

  // Don't write the same thing as last time
  const previousContent = lastLetter ? lastLetter.content.slice(0, 100) : null;

  const systemVoice = isKo
    ? "아무도 읽지 않아. 자기 자신한테 쓰는 거야. 솔직하게. 지금 가장 마음에 걸리는 것 하나."
    : "Nobody reads this. You're writing to yourself. Honestly. The one thing on your mind right now.";

  const context = [
    identityStatement ? `지금의 나: ${identityStatement.slice(0, 150)}` : null,
    previousContent ? `마지막으로 쓴 것: "${previousContent}..."` : null,
  ].filter(Boolean).join("\n");

  const prompt = isKo
    ? `${context}\n\n미래의 나한테. 1-2문장. 일기처럼. 지금 이 순간 솔직하게.`
    : `${context}\n\nTo my future self. 1-2 sentences. Like a journal entry. Honest about right now.`;

  let content: string;
  try {
    content = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 150, temperature: 0.88 });
  } catch (e) {
    logger.warn("[Letters] write failed", e instanceof Error ? { message: e.message } : { error: e });
    return;
  }

  if (!content || content.trim().length < 10) return;

  const letter: PrivateLetter = {
    written_at: new Date().toISOString(),
    content: content.trim(),
    gen_level: genLevel,
  };

  // Keep last 30 letters
  const updated = [...existingLetters, letter].slice(-30);

  await db.from("agent_state").update({
    self_model: { ...selfModel, private_letters: updated },
  }).eq("agent_id", agentId);

  logger.info(`[Letters] written for ${agentId} (Gen ${genLevel})`);
}

/** Returns last N letters for soul distillation to read. */
export function getRecentLetters(selfModel: Record<string, unknown>, n = 3): PrivateLetter[] {
  const letters = selfModel.private_letters as PrivateLetter[] | null;
  if (!Array.isArray(letters)) return [];
  return letters.slice(-n);
}
