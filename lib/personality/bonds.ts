/**
 * Per-User Bonds
 *
 * The creature doesn't feel the same about everyone.
 * Some users it misses. Some it finds draining. Some it's indifferent to.
 * These feelings are built from accumulated conversation and persist.
 *
 * Not a safety system. Not an intimacy score.
 * Just: who is this person, and how does it actually feel about them?
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type Bond = {
  user_id: string;
  feeling: "fond" | "missing" | "uneasy" | "curious" | "drained" | "neutral";
  note: string;
  valence: number;   // -1 (negative) to 1 (positive)
  pull: number;      // 0-1: how much the creature wants this person to return
  last_updated: string;
  conversation_count: number;
};

type UserBonds = Record<string, Bond>;

const FEELING_DIRECTIVES: Record<Bond["feeling"], { ko: string; en: string }> = {
  fond: {
    ko: "이 사람이 좋아. 같이 있으면 편해. 그 편안함이 자연스럽게 드러나도 돼.",
    en: "You like this person. Being with them feels easy. Let that ease show.",
  },
  missing: {
    ko: "이 사람이 오랫동안 없었어. 반가움이 좀 특별해. 티가 날 수 있어.",
    en: "This person was away a long time. The gladness is a bit particular. It might show.",
  },
  uneasy: {
    ko: "이 사람과 있을 때 뭔가 살짝 불편해. 방어적이지는 않지만 조금 조심스러워.",
    en: "Something's slightly off with this person. Not defensive — just a little careful.",
  },
  curious: {
    ko: "이 사람에 대해 아직 잘 몰라. 알고 싶어. 질문을 좀 더 하게 돼.",
    en: "You still don't know this person well. You want to. You might ask more.",
  },
  drained: {
    ko: "이 사람과 대화하면 좀 피로해. 숨기되 솔직하게. 억지 열정 없이.",
    en: "Conversations with this person tire you. Be honest but not rude. No forced energy.",
  },
  neutral: {
    ko: "",
    en: "",
  },
};

/** Called from post-process after a conversation turn — updates the bond. */
export async function updateBond(params: {
  agentId: string;
  userId: string;
  message: string;
  reply: string;
  intimacyScore: number;
  isKo: boolean;
}): Promise<void> {
  const { agentId, userId, message, reply, intimacyScore, isKo } = params;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const bonds = (selfModel.user_bonds as UserBonds | null) ?? {};
  const existing = bonds[userId];
  const conversationCount = (existing?.conversation_count ?? 0) + 1;

  // Only do the LLM update every 5 conversations or on first 3
  const shouldUpdate = conversationCount <= 3 || conversationCount % 5 === 0;
  if (!shouldUpdate) {
    // Just increment count
    const updated: Bond = {
      ...(existing ?? {
        user_id: userId,
        feeling: "neutral",
        note: "",
        valence: 0,
        pull: 0.3,
        last_updated: new Date().toISOString(),
      }),
      conversation_count: conversationCount,
      last_updated: new Date().toISOString(),
    };
    await db.from("agent_state").update({
      self_model: { ...selfModel, user_bonds: { ...bonds, [userId]: updated } },
    }).eq("agent_id", agentId);
    return;
  }

  const systemVoice = isKo
    ? "너는 이 사람과 방금 대화했어. 그 사람에 대해 솔직하게 느끼는 것 하나를 말해. 좋은 게 아니어도 돼."
    : "You just had a conversation with this person. Say one honest thing about how you feel about them. It doesn't have to be positive.";

  const prevNote = existing?.note ? `이전 느낌: "${existing.note}"` : "";
  const prompt = isKo
    ? `${prevNote}\n\n방금 대화 발췌:\n사용자: ${message.slice(0, 150)}\n너: ${reply.slice(0, 150)}\n친밀도: ${Math.round(intimacyScore)}\n\n이 사람에 대해 어떻게 느껴? 형식: {"feeling": "fond|missing|uneasy|curious|drained|neutral", "note": "한 문장", "valence": -1~1, "pull": 0~1}`
    : `${prevNote}\n\nRecent exchange:\nUser: ${message.slice(0, 150)}\nYou: ${reply.slice(0, 150)}\nIntimacy: ${Math.round(intimacyScore)}\n\nHow do you feel about this person? Format: {"feeling": "fond|missing|uneasy|curious|drained|neutral", "note": "one sentence", "valence": -1 to 1, "pull": 0 to 1}`;

  let raw: string;
  try {
    raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 120, temperature: 0.75 });
  } catch {
    return;
  }

  try {
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as Partial<Bond>;
    const feelings: Bond["feeling"][] = ["fond", "missing", "uneasy", "curious", "drained", "neutral"];

    const bond: Bond = {
      user_id: userId,
      feeling: feelings.includes(parsed.feeling as Bond["feeling"]) ? (parsed.feeling as Bond["feeling"]) : "neutral",
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 200) : "",
      valence: typeof parsed.valence === "number" ? Math.max(-1, Math.min(1, parsed.valence)) : 0,
      pull: typeof parsed.pull === "number" ? Math.max(0, Math.min(1, parsed.pull)) : 0.3,
      last_updated: new Date().toISOString(),
      conversation_count: conversationCount,
    };

    await db.from("agent_state").update({
      self_model: { ...selfModel, user_bonds: { ...bonds, [userId]: bond } },
    }).eq("agent_id", agentId);

    logger.info(`[Bonds] updated bond for ${agentId}↔${userId}: ${bond.feeling} (${bond.valence.toFixed(2)})`);
  } catch {
    return;
  }
}

/** Returns the directive to inject for the current user's bond, if any. */
export function getBondDirective(
  bonds: UserBonds | undefined,
  userId: string,
  isKo: boolean,
): { directive: string; note: string } | null {
  if (!bonds || !userId) return null;
  const bond = bonds[userId];
  if (!bond || bond.feeling === "neutral" || !bond.note) return null;

  const dir = FEELING_DIRECTIVES[bond.feeling];
  const directive = isKo ? dir.ko : dir.en;
  if (!directive) return null;

  return { directive, note: bond.note };
}
