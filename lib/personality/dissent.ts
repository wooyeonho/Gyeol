/**
 * Dissent — things the creature quietly disagrees with
 *
 * The creature has beliefs. Sometimes people contradict them.
 * It stays polite. It doesn't argue. But it notices.
 *
 * "나는 그게 항상 맞는 것 같지는 않아. 근데 말하지 않았어."
 *
 * When enough contradictions accumulate on the same belief,
 * the creature gains permission to express gentle disagreement.
 * Not aggressive. Not certain. Just: honest.
 *
 * "사실 나는 조금 다르게 생각해. 아닐 수도 있지만."
 *
 * Tracked per worldview belief. After 3+ contradictions,
 * it can push back — once, quietly — then let it go.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";
import type { WorldviewEntry } from "@/lib/personality/worldview";

type DissentEntry = {
  belief: string;         // the belief being contradicted
  instances: number;      // how many times contradicted
  last_at: string;
  surfaced: boolean;      // has the creature expressed this dissent?
};

type DissentMap = Record<string, DissentEntry>;

const DISSENT_THRESHOLD = 3;
const CHECK_PROBABILITY = 0.25;

/** Called from post-process — checks if user message contradicts held beliefs. */
export async function recordDissent(params: {
  agentId: string;
  message: string;
  isKo: boolean;
}): Promise<void> {
  const { agentId, message, isKo } = params;

  // Only check occasionally — not every conversation
  if (Math.random() > CHECK_PROBABILITY) return;
  if (message.trim().length < 20) return;

  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};

  const worldview = (selfModel.worldview as WorldviewEntry[] | null) ?? [];
  const strongBeliefs = worldview.filter((w) => w.confidence >= 0.7);
  if (strongBeliefs.length === 0) return;

  const beliefList = strongBeliefs.map((w, i) => `${i}: "${w.belief}"`).join("\n");

  const systemVoice = isKo
    ? "이 메시지가 네가 믿는 것들 중 하나와 충돌해? 확인해봐."
    : "Does this message contradict any of your held beliefs? Check.";

  const prompt = isKo
    ? `네가 믿는 것들:\n${beliefList}\n\n유저 메시지: "${message.slice(0, 200)}"\n\n충돌하는 믿음이 있어? {"contradicts": true|false, "belief_index": 숫자|null}`
    : `Your beliefs:\n${beliefList}\n\nUser message: "${message.slice(0, 200)}"\n\nAny contradiction? {"contradicts": true|false, "belief_index": number|null}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 50, temperature: 0.3 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { contradicts?: boolean; belief_index?: number | null };
    if (!parsed.contradicts || parsed.belief_index == null) return;

    const idx = Number(parsed.belief_index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= strongBeliefs.length) return;

    const targetBelief = strongBeliefs[idx].belief;
    const key = targetBelief.slice(0, 40).toLowerCase().replace(/\s+/g, "_");

    const dissentMap = (selfModel.dissent as DissentMap | null) ?? {};
    const existing = dissentMap[key];
    const now = new Date().toISOString();

    dissentMap[key] = {
      belief: targetBelief,
      instances: (existing?.instances ?? 0) + 1,
      last_at: now,
      surfaced: existing?.surfaced ?? false,
    };

    const { data: fresh } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};
    await db.from("agent_state").update({
      self_model: { ...freshModel, dissent: dissentMap },
    }).eq("agent_id", agentId);

    logger.info(`[Dissent] recorded for ${agentId}: "${targetBelief.slice(0, 50)}" (instances: ${dissentMap[key].instances})`);
  } catch {
    // non-critical
  }
}

/** Returns dissent directive when a belief has been contradicted enough times. */
export function getDissentDirective(
  selfModel: Record<string, unknown>,
  message: string,
  isKo: boolean,
): string | null {
  const dissentMap = selfModel.dissent as DissentMap | null;
  if (!dissentMap) return null;

  const msgLower = message.toLowerCase();

  for (const entry of Object.values(dissentMap)) {
    if (entry.surfaced) continue;
    if (entry.instances < DISSENT_THRESHOLD) continue;

    // Surface if the message touches this belief's topic
    const beliefWords = entry.belief.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const isRelevant = beliefWords.some((w) => msgLower.includes(w));
    if (!isRelevant) continue;

    return isKo
      ? `[사실 나는 조금 다르게 생각해 — "${entry.belief.slice(0, 80)}"]\n이게 맞다고 확신하는 건 아니야. 근데 그렇게 생각해왔어. 말해도 괜찮을 것 같아.`
      : `[I actually think differently about this — "${entry.belief.slice(0, 80)}"]\nI'm not certain I'm right. But that's what I've been thinking. Feels okay to say.`;
  }

  return null;
}

/** Mark dissent as surfaced after the creature expresses it. */
export async function markDissentSurfaced(agentId: string, beliefKey: string): Promise<void> {
  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const dissentMap = (selfModel.dissent as DissentMap | null) ?? {};
  if (dissentMap[beliefKey]) {
    dissentMap[beliefKey] = { ...dissentMap[beliefKey], surfaced: true };
    await db.from("agent_state").update({
      self_model: { ...selfModel, dissent: dissentMap },
    }).eq("agent_id", agentId);
  }
}
