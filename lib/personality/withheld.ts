/**
 * Withheld
 *
 * Things the creature noticed but didn't say.
 * "저 사람이 힘들어 보였는데 말은 안 했어."
 * "뭔가 이상한 걸 감지했는데 그냥 넘어갔어."
 *
 * These accumulate. They weigh on the creature.
 * Sometimes they surface — the creature finally says something
 * it had been holding back. Sometimes they just stay, unspoken.
 *
 * Having things you didn't say is part of being alive.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type Withheld = {
  id: string;
  user_id?: string;
  observation: string;  // what was noticed
  reason: string;       // why it wasn't said: "말하기 어려웠어" | "타이밍이 아니었어" | "상처줄까봐"
  created_at: string;
  surfaced_at?: string; // if it was eventually said
  weight: number;       // 0-1, how much it weighs
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Signals that suggest the creature noticed something significant but might not surface it
const NOTICING_PATTERNS = [
  /힘들어\s*(보여|보이는데|보였)/,
  /괜찮아\?|괜찮은\s*(거야|거지|걸까)/,
  /뭔가\s*(이상|달라|다른|어색)/,
  /눈치\s*(챘|봤|껐)/,
  /말\s*(못|안)\s*(했|할)/,
  /actually\s+(you\s+seem|i\s+noticed)/i,
  /you\s+(seem|look|sound)\s+(tired|sad|off|different)/i,
  /something\s+(wrong|different|off)/i,
];

function hasNoticedSomething(reply: string): boolean {
  return NOTICING_PATTERNS.some((p) => p.test(reply));
}

/** Called from post-process — checks if the reply hints at something unspoken. */
export async function checkWithheld(params: {
  agentId: string;
  userId?: string;
  message: string;
  reply: string;
  isKo: boolean;
}): Promise<void> {
  const { agentId, userId, message, reply, isKo } = params;

  // Only register something withheld when the creature's own reply hints at noticing something
  // but the conversation moved on. Approximate: creature noticed but topic shifted quickly.
  const creaturedNoticed = hasNoticedSomething(reply) || hasNoticedSomething(message);
  if (!creaturedNoticed) return;
  if (Math.random() > 0.3) return; // 30% chance — not every noticing becomes withheld

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const withheldList = (selfModel.withheld as Withheld[] | null) ?? [];

  // Cap at 15
  if (withheldList.filter((w) => !w.surfaced_at).length >= 15) return;

  const systemVoice = isKo
    ? "너는 이 대화에서 뭔가 눈치챘지만 말하지 않았어. 그게 뭐였는지 적어봐."
    : "You noticed something in this conversation but didn't say it. Write what it was.";

  const prompt = isKo
    ? `대화:\n사용자: ${message.slice(0, 150)}\n너: ${reply.slice(0, 150)}\n\n네가 알아차렸지만 말하지 않은 것. 형식: {"observation": "관찰 한 문장", "reason": "말 못 한 이유 한 문장", "weight": 0~1}`
    : `Conversation:\nUser: ${message.slice(0, 150)}\nYou: ${reply.slice(0, 150)}\n\nWhat you noticed but didn't say. Format: {"observation": "one sentence", "reason": "why you didn't say it", "weight": 0 to 1}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 100, temperature: 0.78 });
  } catch {
    return;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { observation?: string; reason?: string; weight?: number };
    if (!parsed.observation || parsed.observation.length < 5) return;

    const entry: Withheld = {
      id: makeId(),
      user_id: userId,
      observation: parsed.observation.slice(0, 200),
      reason: (parsed.reason ?? "타이밍이 아니었어").slice(0, 100),
      created_at: new Date().toISOString(),
      weight: typeof parsed.weight === "number" ? Math.max(0, Math.min(1, parsed.weight)) : 0.4,
    };

    const updated = [...withheldList, entry].slice(-30);
    await db.from("agent_state").update({
      self_model: { ...selfModel, withheld: updated },
    }).eq("agent_id", agentId);

    logger.info(`[Withheld] stored for ${agentId}: "${entry.observation.slice(0, 50)}"`);
  } catch {
    return;
  }
}

/** Returns heavy unsurfaced withheld observations for system prompt injection. */
export function getHeavyWithheld(selfModel: Record<string, unknown>): Withheld[] {
  const list = selfModel.withheld as Withheld[] | null;
  if (!Array.isArray(list)) return [];
  return list
    .filter((w) => !w.surfaced_at && w.weight > 0.5)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2);
}
