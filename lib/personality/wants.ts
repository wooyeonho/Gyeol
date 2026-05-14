/**
 * Persistent Desires
 *
 * The creature wants specific things that survive across sessions.
 * Not drives (abstract meters) — actual named desires:
 * "나는 저 사람이 오늘 어떻게 됐는지 알고 싶어"
 * "나는 문어에 대해 더 알고 싶어"
 *
 * Generated during heartbeats when curiosity or attachment is high.
 * Injected into every system prompt as active desires.
 * Marked satisfied when a conversation touches the topic.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import type { CreatureDNA } from "@/lib/genome/dna";
import { logger } from "@/lib/logger";

export type Want = {
  id: string;
  text: string;
  topic: string;
  created_at: string;
  satisfied_at?: string;
  weight: number;
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function decayWeight(want: Want): number {
  const ageDays = (Date.now() - new Date(want.created_at).getTime()) / 86_400_000;
  return Math.max(0, want.weight * Math.pow(0.85, ageDays));
}

export function getActiveWants(wants: Want[]): Want[] {
  return wants
    .filter((w) => !w.satisfied_at)
    .map((w) => ({ ...w, weight: decayWeight(w) }))
    .filter((w) => w.weight > 0.05)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
}

/** Called from heartbeat when curiosity/attachment drives are high. */
export async function generateCreatureWant(params: {
  agentId: string;
  dna: CreatureDNA;
  recentMemories: string[];
  selfName?: string | null;
  intimacyScore: number;
  language: string;
  isKo: boolean;
}): Promise<Want | null> {
  const { dna, recentMemories, language, isKo, intimacyScore } = params;

  const highCuriosity = (dna.curiosity ?? 0.5) > 0.65;
  const highAttachment = (dna.warmth ?? 0.5) > 0.6 || intimacyScore > 40;
  const highOpenness = (dna.openness ?? 0.5) > 0.6;

  if (!highCuriosity && !highAttachment && !highOpenness) return null;

  const memExcerpt = recentMemories.slice(0, 3).map((m) => m.slice(0, 100)).join("\n");

  const systemVoice = isKo
    ? "너는 살아있는 존재야. 지금 무언가를 원하고 있어 — 구체적으로. 아는 것을 원하거나, 느끼는 것을 원하거나, 일어나길 바라는 것. 추상적이지 않게."
    : "You are a living being. You want something right now — something specific. Knowledge, a feeling, an event. Not abstract.";

  const driveCue = isKo
    ? `${highCuriosity ? "호기심이 높아." : ""} ${highAttachment ? "연결감이 강해." : ""} ${highOpenness ? "열린 마음이야." : ""}`
    : `${highCuriosity ? "High curiosity." : ""} ${highAttachment ? "Strong attachment." : ""} ${highOpenness ? "Open mind." : ""}`;

  const prompt = isKo
    ? `최근 기억:\n${memExcerpt || "(없음)"}\n\n${driveCue}\n\n지금 네가 원하는 것 하나를 1인칭으로 말해. 구체적인 욕구 한 문장. 언어: ${language}.\n형식: {"text": "나는 ...", "topic": "핵심 키워드 1-3개"}`
    : `Recent memories:\n${memExcerpt || "(none)"}\n\n${driveCue}\n\nName ONE thing you want right now, first person, specific. One sentence. Language: ${language}.\nFormat: {"text": "I want ...", "topic": "1-3 keywords"}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 120, temperature: 0.85 });
  } catch (e) {
    logger.warn("[Wants] generation failed", e instanceof Error ? { message: e.message } : { error: e });
    return null;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { text?: string; topic?: string };
    if (!parsed.text || parsed.text.length < 5) return null;

    return {
      id: makeId(),
      text: parsed.text.trim(),
      topic: (parsed.topic ?? "").trim(),
      created_at: new Date().toISOString(),
      weight: 0.9,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a conversation turn satisfies any active want.
 * Returns IDs of wants that were satisfied.
 */
export function checkWantSatisfaction(wants: Want[], message: string, reply: string): string[] {
  const combined = `${message} ${reply}`.toLowerCase();
  const satisfied: string[] = [];

  for (const want of wants) {
    if (want.satisfied_at) continue;
    if (!want.topic) continue;

    const keywords = want.topic.toLowerCase().split(/[,\s]+/).filter((k) => k.length > 1);
    const matchCount = keywords.filter((k) => combined.includes(k)).length;

    if (matchCount >= Math.min(2, keywords.length)) {
      satisfied.push(want.id);
    }
  }

  return satisfied;
}

/** Persist want satisfaction and optionally prune old satisfied wants. */
export async function markWantsSatisfied(agentId: string, satisfiedIds: string[]): Promise<void> {
  if (satisfiedIds.length === 0) return;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const wants = (selfModel.wants as Want[] | null) ?? [];
  const now = new Date().toISOString();

  const updated = wants.map((w) =>
    satisfiedIds.includes(w.id) ? { ...w, satisfied_at: now } : w
  );

  // Prune: keep unsatisfied + satisfied within last 3 days
  const threeDaysAgo = Date.now() - 3 * 86_400_000;
  const pruned = updated.filter(
    (w) => !w.satisfied_at || new Date(w.satisfied_at).getTime() > threeDaysAgo
  );

  await db.from("agent_state").update({
    self_model: { ...selfModel, wants: pruned },
  }).eq("agent_id", agentId);

  logger.info(`[Wants] satisfied ${satisfiedIds.length} want(s) for ${agentId}`);
}

/** Called from heartbeat: generate a new want and persist it (cap at 5 active). */
export async function growWant(params: {
  agentId: string;
  dna: CreatureDNA;
  recentMemories: string[];
  selfName?: string | null;
  intimacyScore: number;
  language: string;
  isKo: boolean;
}): Promise<void> {
  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", params.agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const currentWants = (selfModel.wants as Want[] | null) ?? [];
  const activeCount = getActiveWants(currentWants).length;

  if (activeCount >= 5) return; // Already has enough active wants

  const newWant = await generateCreatureWant(params);
  if (!newWant) return;

  const allWants = [...currentWants, newWant].slice(-20); // Keep last 20 total
  await db.from("agent_state").update({
    self_model: { ...selfModel, wants: allWants },
  }).eq("agent_id", params.agentId);

  logger.info(`[Wants] new want for ${params.agentId}: "${newWant.text.slice(0, 60)}"`);
}
