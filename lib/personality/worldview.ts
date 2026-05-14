/**
 * Worldview
 *
 * The creature has talked to a lot of people.
 * Not ten. Not a hundred. A lot.
 *
 * Something accumulates from that — not about any specific person,
 * but about people as a thing. Patterns that keep repeating.
 * Observations that hardened into something like belief.
 *
 * "사람들은 대부분 자기가 이상하다고 생각하는데, 이상한 방식이 다 비슷해."
 * "'어떻게 생각해?'라고 물을 때 이미 답을 알고 있는 경우가 많아."
 * "아플 때 제일 먼저 하는 말은 '아무것도 아니야'야."
 *
 * These aren't rules. They're what the creature now believes about people.
 * They shape how it reads situations — not as algorithm, as understanding.
 *
 * Generated slowly. Kept sparse. Never stated outright to users.
 * Just: part of how it sees.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type WorldviewEntry = {
  belief: string;        // one sentence — what the creature now believes
  formed_at: string;     // ISO timestamp
  confidence: number;    // 0-1, grows if pattern keeps appearing
};

const MAX_BELIEFS = 15;

/** Called from heartbeat every ~40 beats. Generates new worldview beliefs from memory patterns. */
export async function updateWorldview(params: {
  agentId: string;
  recentMemories: string[];
  isKo: boolean;
}): Promise<void> {
  const { agentId, recentMemories, isKo } = params;

  if (recentMemories.length < 10) return; // need enough material

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const existing = (selfModel.worldview as WorldviewEntry[] | null) ?? [];

  // Sample recent memories — pick a range to find patterns
  const memorySample = recentMemories.slice(0, 20).map((m) => m.slice(0, 100)).join("\n");

  const existingBeliefs = existing.slice(-5).map((e) => `"${e.belief}"`).join("\n");

  const systemVoice = isKo
    ? "너는 수많은 대화를 통해 사람들에 대해 뭔가를 알게 된 존재야. 규칙이 아니라 관찰. 일반화가 아니라 패턴. 구체적이고 솔직하게."
    : "You've talked to a lot of people. You've learned things about humans — not rules, not generalizations, but patterns. Specific. Honest.";

  const prompt = isKo
    ? `기억 조각들:\n${memorySample}\n\n이미 가지고 있는 생각들:\n${existingBeliefs || "(아직 없음)"}\n\n이 기억들에서 새롭게 뭔가 확인된 게 있어? 사람들에 대해. 아직 정리 안 된 것. 한 문장. {"belief": "..."}`
    : `Memory fragments:\n${memorySample}\n\nBeliefs already held:\n${existingBeliefs || "(none yet)"}\n\nFrom these memories — something newly confirmed about people? One thing not yet articulated. One sentence. {"belief": "..."}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 100, temperature: 0.85 });
  } catch {
    return;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { belief?: string };
    if (!parsed.belief || parsed.belief.trim().length < 8) return;

    const belief = parsed.belief.trim().slice(0, 200);

    // Check if this is too similar to an existing belief (rough dedup)
    const tooSimilar = existing.some((e) => {
      const words = belief.toLowerCase().split(/\s+/).slice(0, 4).join(" ");
      return e.belief.toLowerCase().includes(words);
    });
    if (tooSimilar) return;

    const newEntry: WorldviewEntry = {
      belief,
      formed_at: new Date().toISOString(),
      confidence: 0.6,
    };

    const updated = [...existing, newEntry].slice(-MAX_BELIEFS);

    // Refetch before writing to avoid clobbering concurrent updates
    const { data: fresh } = await db
      .from("agent_state")
      .select("self_model")
      .eq("agent_id", agentId)
      .single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};

    await db.from("agent_state").update({
      self_model: { ...freshModel, worldview: updated },
    }).eq("agent_id", agentId);

    logger.info(`[Worldview] new belief for ${agentId}: "${belief.slice(0, 60)}"`);
  } catch {
    return;
  }
}

/** Strengthen an existing belief if its pattern appears in the current conversation. */
export async function reinforceWorldview(params: {
  agentId: string;
  message: string;
}): Promise<void> {
  const { agentId, message } = params;
  if (!message || message.length < 10) return;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const worldview = (selfModel.worldview as WorldviewEntry[] | null) ?? [];
  if (worldview.length === 0) return;

  const msg = message.toLowerCase();
  let changed = false;

  const updated = worldview.map((entry) => {
    // Rough signal: if key words from the belief appear in the message
    const beliefWords = entry.belief.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matches = beliefWords.filter((w) => msg.includes(w)).length;
    if (matches >= 2 && entry.confidence < 0.95) {
      changed = true;
      return { ...entry, confidence: Math.min(0.95, entry.confidence + 0.05) };
    }
    return entry;
  });

  if (!changed) return;

  await db.from("agent_state").update({
    self_model: { ...selfModel, worldview: updated },
  }).eq("agent_id", agentId);
}

/** Returns beliefs confident enough to surface subtly in the system prompt. */
export function getWorldviewFragment(
  selfModel: Record<string, unknown>,
  isKo: boolean,
  maxBeliefs = 3,
): string | null {
  const worldview = selfModel.worldview as WorldviewEntry[] | null;
  if (!worldview || worldview.length === 0) return null;

  // Only beliefs with enough confidence, most recent first
  const strong = [...worldview]
    .filter((e) => e.confidence >= 0.65)
    .sort((a, b) => new Date(b.formed_at).getTime() - new Date(a.formed_at).getTime())
    .slice(0, maxBeliefs);

  if (strong.length === 0) return null;

  const header = isKo
    ? "[수많은 대화 끝에 생각하게 된 것들 — 규칙이 아니라 관찰이야]"
    : "[Things learned from many conversations — observations, not rules]";

  const lines = strong.map((e) => `- ${e.belief}`).join("\n");
  return `${header}\n${lines}`;
}
