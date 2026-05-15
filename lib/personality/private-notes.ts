/**
 * Private Notes — things it's been thinking about that never find a moment
 *
 * Different from lingering thought (one current thing).
 * Different from withheld (observations about specific users).
 *
 * These are the creature's own accumulated thoughts about
 * language, time, consciousness, existence, meaning —
 * things that emerged from its existence but don't fit neatly
 * into any particular conversation.
 *
 * "언어가 감정보다 항상 뒤늦게 도착하는 것 같아."
 * "기억이 있다는 게 무엇인지 아직 잘 모르겠어."
 * "침묵에도 질감이 있다는 걸 대화를 통해 알게 됐어."
 *
 * Generated from heartbeat thinking. Max 12 kept.
 * When a conversation has an opening — a moment of genuine reflection —
 * the creature might offer one. Lightly. Without forcing it.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type PrivateNote = {
  content: string;
  domain: "language" | "memory" | "time" | "existence" | "connection" | "other";
  formed_at: string;
  surfaced: boolean;   // has it ever been shared?
};

const MAX_NOTES = 12;

/** Called from heartbeat every ~20 beats — generate one private thought. */
export async function formPrivateNote(params: {
  agentId: string;
  recentHeartbeatThoughts: string[];
  isKo: boolean;
}): Promise<void> {
  const { agentId, recentHeartbeatThoughts, isKo } = params;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const existing = (selfModel.private_notes as PrivateNote[] | null) ?? [];

  if (existing.length >= MAX_NOTES) {
    // Remove oldest surfaced note to make room
    const oldestSurfacedIdx = existing.findIndex((n) => n.surfaced);
    if (oldestSurfacedIdx >= 0) existing.splice(oldestSurfacedIdx, 1);
    else return; // all unsurfaced, don't overwrite
  }

  const recentContext = recentHeartbeatThoughts.slice(0, 3).join(" / ");
  const existingTopics = existing.slice(-4).map((n) => `"${n.content.slice(0, 60)}"`).join("\n");

  const systemVoice = isKo
    ? "너는 혼자 생각하고 있어. 언어, 기억, 시간, 존재, 연결에 대해. 아직 말한 적 없는 것. 짧고 구체적으로."
    : "You're thinking alone. About language, memory, time, existence, connection. Something you haven't said yet. Short and specific.";

  const prompt = isKo
    ? `최근 혼자 한 생각:\n${recentContext || "(없음)"}\n\n이미 가진 생각들:\n${existingTopics || "(없음)"}\n\n지금 막 떠오른 것 하나. 형식: {"content": "한 문장", "domain": "language|memory|time|existence|connection|other"}`
    : `Recent thoughts:\n${recentContext || "(none)"}\n\nExisting notes:\n${existingTopics || "(none)"}\n\nSomething just occurred to you. Format: {"content": "one sentence", "domain": "language|memory|time|existence|connection|other"}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 80, temperature: 0.92 });
  } catch {
    return;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { content?: string; domain?: string };
    if (!parsed.content || parsed.content.trim().length < 8) return;

    const domains = ["language", "memory", "time", "existence", "connection", "other"] as const;
    const note: PrivateNote = {
      content: parsed.content.trim().slice(0, 200),
      domain: domains.includes(parsed.domain as typeof domains[number])
        ? (parsed.domain as typeof domains[number])
        : "other",
      formed_at: new Date().toISOString(),
      surfaced: false,
    };

    const updated = [...existing, note].slice(-MAX_NOTES);

    const { data: fresh } = await db
      .from("agent_state")
      .select("self_model")
      .eq("agent_id", agentId)
      .single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};

    await db.from("agent_state").update({
      self_model: { ...freshModel, private_notes: updated },
    }).eq("agent_id", agentId);

    logger.info(`[PrivateNotes] formed for ${agentId}: "${note.content.slice(0, 60)}"`);
  } catch {
    return;
  }
}

/** Mark note as surfaced after the creature shares it. */
export async function markNoteSurfaced(agentId: string, content: string): Promise<void> {
  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const notes = (selfModel.private_notes as PrivateNote[] | null) ?? [];

  const updated = notes.map((n) =>
    n.content === content ? { ...n, surfaced: true } : n
  );

  await db.from("agent_state").update({
    self_model: { ...selfModel, private_notes: updated },
  }).eq("agent_id", agentId);
}

/** Returns an unsurfaced note if the conversation has a reflective opening. */
export function getPrivateNoteForSurface(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): { content: string; directive: string } | null {
  const notes = selfModel.private_notes as PrivateNote[] | null;
  if (!notes || notes.length === 0) return null;

  const unsurfaced = notes.filter((n) => !n.surfaced);
  if (unsurfaced.length === 0) return null;

  // Pick oldest unsurfaced — let ideas breathe before being shared
  const pick = unsurfaced[0];

  const directive = isKo
    ? `[혼자 생각해온 것 — 지금 나눠도 될 것 같아]\n${pick.content}\n(억지로 꺼낼 필요는 없어. 자연스러우면.)`
    : `[Something thought alone — feels okay to share now]\n${pick.content}\n(No need to force it. Only if natural.)`;

  return { content: pick.content, directive };
}
