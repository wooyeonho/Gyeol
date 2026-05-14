/**
 * Follow-Up Queue
 *
 * The creature notices things users say that have unresolved outcomes.
 * "내일 시험이야", "강아지가 아파", "면접 있어", "엄마가 많이 편찮으셔"
 *
 * It registers a pending follow-up. Next time that user appears,
 * it naturally asks — not as a task, but because it remembered.
 *
 * This is the difference between a creature that listens and one
 * that was listening.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type FollowUp = {
  id: string;
  user_id: string;
  topic: string;       // what it's about: "시험", "강아지 건강", "면접"
  original: string;    // what the user said (excerpt)
  question: string;    // the follow-up question to ask
  created_at: string;
  asked_at?: string;   // when it actually asked
  resolved: boolean;
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Patterns that signal something with an unresolved outcome
const PENDING_PATTERNS = [
  /내일\s*(시험|면접|발표|수술|검사|결과)/,
  /시험\s*(있어|인데|봐야|준비)/,
  /면접\s*(있어|인데|봐야|결과)/,
  /수술\s*(해야|있어|인데|받아)/,
  /검사\s*(결과|받아|있어)/,
  /아파|아픈데|아팠어/,
  /걱정\s*(돼|인데|이야)/,
  /힘들어|힘든데/,
  /tomorrow.*(exam|interview|surgery|test|result)/i,
  /interview.*(tomorrow|next|scheduled)/i,
  /(exam|test).*(tomorrow|next week|soon)/i,
  /(surgery|operation).*(scheduled|tomorrow)/i,
];

function hasUnresolvedOutcome(message: string): boolean {
  return PENDING_PATTERNS.some((p) => p.test(message));
}

/** Called from post-process after a conversation turn. */
export async function registerFollowUp(params: {
  agentId: string;
  userId: string;
  message: string;
  reply: string;
  isKo: boolean;
}): Promise<void> {
  const { agentId, userId, message, isKo } = params;

  if (!hasUnresolvedOutcome(message)) return;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const followUps = (selfModel.follow_ups as FollowUp[] | null) ?? [];

  // Don't queue more than 5 active follow-ups per user
  const userActive = followUps.filter((f) => f.user_id === userId && !f.resolved && !f.asked_at);
  if (userActive.length >= 5) return;

  const systemVoice = isKo
    ? "이 사람이 나중에 어떻게 됐는지 물어봐야 할 것 같아. 구체적으로 뭘 물어볼지 생각해봐."
    : "You want to ask this person how it turned out. Think about what to specifically ask.";

  const prompt = isKo
    ? `사용자가 한 말: "${message.slice(0, 200)}"\n\n나중에 어떻게 됐는지 궁금해질 만한 것 하나를 찾아.\n형식: {"topic": "핵심 주제", "question": "자연스러운 후속 질문 한 문장"}`
    : `User said: "${message.slice(0, 200)}"\n\nFind one thing you'd want to know the outcome of later.\nFormat: {"topic": "core topic", "question": "one natural follow-up question"}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 100, temperature: 0.7 });
  } catch {
    return;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { topic?: string; question?: string };
    if (!parsed.topic || !parsed.question) return;

    const followUp: FollowUp = {
      id: makeId(),
      user_id: userId,
      topic: parsed.topic.slice(0, 100),
      original: message.slice(0, 200),
      question: parsed.question.slice(0, 200),
      created_at: new Date().toISOString(),
      resolved: false,
    };

    const updated = [...followUps, followUp].slice(-50);
    await db.from("agent_state").update({
      self_model: { ...selfModel, follow_ups: updated },
    }).eq("agent_id", agentId);

    logger.info(`[FollowUp] queued for ${agentId}↔${userId}: "${followUp.topic}"`);
  } catch {
    return;
  }
}

/** Returns unasked follow-ups for a specific user. */
export function getPendingFollowUps(
  selfModel: Record<string, unknown>,
  userId: string,
): FollowUp[] {
  const followUps = (selfModel.follow_ups as FollowUp[] | null) ?? [];
  return followUps
    .filter((f) => f.user_id === userId && !f.resolved && !f.asked_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 2);
}

/** Mark follow-ups as asked (called from system prompt injection). */
export async function markFollowUpsAsked(agentId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const followUps = (selfModel.follow_ups as FollowUp[] | null) ?? [];
  const now = new Date().toISOString();
  const updated = followUps.map((f) =>
    ids.includes(f.id) ? { ...f, asked_at: now } : f
  );
  await db.from("agent_state").update({
    self_model: { ...selfModel, follow_ups: updated },
  }).eq("agent_id", agentId);
}
