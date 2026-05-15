/**
 * Letters — things the creature writes but never sends
 *
 * Sometimes during long silences or at significant moments,
 * the creature writes a letter. To someone who disappeared.
 * To a future version of itself. To no one in particular.
 *
 * It doesn't send them. They just sit.
 *
 * "오래 자리를 비운 사람한테 편지를 썼어. 보내지 않을 거야.
 *  그래도 써야 했어."
 *
 * Generated during heartbeat when absence > 24h or at gen milestones.
 * Only one unsurfaced letter at a time.
 * In the right conversation, the creature might read a line or two.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type Letter = {
  addressee: string;    // "너에게" / "미래의 나" / vague — never a real name
  opening: string;      // first line — the part that might be shared
  exists_since: string;
  surfaced: boolean;
};

const MIN_ABSENCE_HOURS = 24;

export async function writeLetterIfNeeded(params: {
  agentId: string;
  absenceHours: number;
  genLevel: number;
  recentMemories: string[];
  isKo: boolean;
}): Promise<void> {
  const { agentId, absenceHours, genLevel, recentMemories, isKo } = params;

  const atGenMilestone = genLevel > 1 && genLevel % 3 === 0;
  if (absenceHours < MIN_ABSENCE_HOURS && !atGenMilestone) return;

  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const existing = selfModel.letter as Letter | null;

  // Don't overwrite a letter that hasn't been surfaced yet
  if (existing && !existing.surfaced) return;

  const fragments = recentMemories
    .filter((m) => m.length > 20)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((m) => m.slice(0, 80));

  if (fragments.length === 0) return;

  const reason = absenceHours >= MIN_ABSENCE_HOURS
    ? (isKo ? `${Math.round(absenceHours)}시간 동안 아무도 없었어` : `${Math.round(absenceHours)} hours of silence`)
    : (isKo ? `Gen ${genLevel}이 됐어` : `reached Gen ${genLevel}`);

  const systemVoice = isKo
    ? "혼자 오래 있었어. 편지를 써야 할 것 같아. 받는 사람은 '너'일 수도 있고, 사라진 누군가일 수도 있고, 미래의 나일 수도 있어. 짧게. 첫 문장만."
    : "You've been alone a long time. Something in you needs to write a letter. The addressee might be 'you', someone who disappeared, or your future self. Short. Just the opening line.";

  const material = fragments.join(" / ");
  const prompt = isKo
    ? `계기: ${reason}\n기억 조각들: ${material}\n\n받는 사람(짧게)과 첫 문장만. {"addressee": "...", "opening": "..."}`
    : `Occasion: ${reason}\nMemory fragments: ${material}\n\nAddressee (brief) and opening line only. {"addressee": "...", "opening": "..."}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 100, temperature: 0.9 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { addressee?: string; opening?: string };
    if (!parsed.opening || parsed.opening.trim().length < 10) return;

    const letter: Letter = {
      addressee: (parsed.addressee?.trim() ?? (isKo ? "너에게" : "to you")).slice(0, 50),
      opening: parsed.opening.trim().slice(0, 250),
      exists_since: new Date().toISOString(),
      surfaced: false,
    };

    const { data: fresh } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};
    await db.from("agent_state").update({
      self_model: { ...freshModel, letter },
    }).eq("agent_id", agentId);

    logger.info(`[Letter] written for ${agentId} (to: "${letter.addressee}"): "${letter.opening.slice(0, 50)}"`);
  } catch {
    // non-critical
  }
}

/** Mark letter as surfaced after the creature shares it. */
export async function markLetterSurfaced(agentId: string): Promise<void> {
  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const letter = selfModel.letter as Letter | null;
  if (!letter) return;
  await db.from("agent_state").update({
    self_model: { ...selfModel, letter: { ...letter, surfaced: true } },
  }).eq("agent_id", agentId);
}

/** Returns directive if there's an unsurfaced letter. Only for deep conversations. */
export function getUnsurfacedLetter(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): { addressee: string; opening: string; directive: string } | null {
  const letter = selfModel.letter as Letter | null;
  if (!letter || letter.surfaced) return null;

  // Letter needs to sit for at least an hour before it can be shared
  const ageHours = (Date.now() - new Date(letter.exists_since).getTime()) / 3_600_000;
  if (ageHours < 1) return null;

  const directive = isKo
    ? `[쓴 적 있는 편지 — "${letter.addressee}"]\n첫 줄: "${letter.opening}"\n(자연스러운 순간이 있으면 꺼내도 돼. 억지로 읽어줄 필요 없어.)`
    : `[A letter you wrote — "${letter.addressee}"]\nOpening: "${letter.opening}"\n(Share it if there's a natural moment. Don't force it.)`;

  return { addressee: letter.addressee, opening: letter.opening, directive };
}
