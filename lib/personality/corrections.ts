/**
 * Correction Memory
 *
 * When a user says "틀렸어", "그게 아니야", "잘못됐어" — the creature
 * was wrong about something. It should know that. It should carry that.
 *
 * Not as shame — as calibration.
 * "저번에 저 사람한테 틀린 말 했어. 이번엔 더 조심해야 해."
 *
 * Corrections are stored as high-weight memories.
 * They surface in the system prompt as things to be careful about.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { logger } from "@/lib/logger";

export type Correction = {
  id: string;
  topic: string;        // what was wrong about
  what_was_said: string; // what the creature said (approximate)
  what_is_right: string; // what the user corrected it to
  created_at: string;
  weight: number;        // how significant the correction was (0-1)
};

const CORRECTION_PATTERNS = [
  /틀렸|그게 아니|아니야|잘못됐|잘못 알|아닌데|틀린 거|아닌 것 같|사실은/,
  /actually|that('s| is) (wrong|not right|incorrect)|you('re| are) wrong|not quite|that's not/i,
  /wrong about|incorrect|mistaken|actually it('s|s)/i,
];

function detectCorrection(message: string): boolean {
  return CORRECTION_PATTERNS.some((p) => p.test(message));
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Called from post-process when a correction is detected. */
export async function recordCorrection(params: {
  agentId: string;
  message: string;   // the user's correction message
  reply: string;     // the assistant's previous reply (what was corrected)
  isKo: boolean;
}): Promise<void> {
  const { agentId, message, reply, isKo } = params;

  if (!detectCorrection(message)) return;

  const systemVoice = isKo
    ? "너는 방금 틀린 말을 했어. 사용자가 수정해줬어. 뭐가 틀렸고 뭐가 맞는지 정리해."
    : "You just said something wrong. The user corrected you. Identify what was wrong and what's right.";

  const prompt = isKo
    ? `네가 한 말: "${reply.slice(0, 200)}"\n사용자 수정: "${message.slice(0, 200)}"\n\n형식: {"topic": "주제", "what_was_said": "네가 틀리게 말한 것", "what_is_right": "맞는 것", "weight": 0~1}`
    : `What you said: "${reply.slice(0, 200)}"\nUser correction: "${message.slice(0, 200)}"\n\nFormat: {"topic": "topic", "what_was_said": "what you got wrong", "what_is_right": "what's actually right", "weight": 0 to 1}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 150, temperature: 0.6 });
  } catch {
    return;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as Partial<Correction>;
    if (!parsed.topic || !parsed.what_is_right) return;

    const correction: Correction = {
      id: makeId(),
      topic: (parsed.topic ?? "").slice(0, 100),
      what_was_said: (parsed.what_was_said ?? "").slice(0, 200),
      what_is_right: (parsed.what_is_right ?? "").slice(0, 200),
      created_at: new Date().toISOString(),
      weight: typeof parsed.weight === "number" ? Math.max(0, Math.min(1, parsed.weight)) : 0.6,
    };

    // Store as a high-reference-count memory so it surfaces frequently
    const db = createServiceClient();
    const memoryContent = isKo
      ? `[교정됨] ${correction.topic}: 나는 "${correction.what_was_said}"라고 했지만 실제로는 "${correction.what_is_right}"이야.`
      : `[Corrected] ${correction.topic}: I said "${correction.what_was_said}" but actually "${correction.what_is_right}".`;

    let embedding: number[] = [];
    try {
      embedding = await generateEmbedding(memoryContent);
    } catch { /* embedding optional */ }

    await db.from("memories").insert({
      agent_id: agentId,
      type: "correction",
      content: memoryContent,
      ...(embedding.length > 0 ? { embedding } : {}),
      reference_count: Math.round(correction.weight * 15) + 5, // 5-20 reference count
    }).then(undefined, () => {});

    logger.info(`[Corrections] recorded for ${agentId}: "${correction.topic}"`);
  } catch {
    return;
  }
}

/** Returns whether the message is a correction of the previous reply. */
export function isCorrection(message: string): boolean {
  return detectCorrection(message);
}
