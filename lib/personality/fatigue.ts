/**
 * Conversation Fatigue
 *
 * Not a bad day (that's random, weather-like).
 * Not a mood. Earned.
 *
 * Too many conversations that felt hollow.
 * Too many times giving the expected answer.
 * Too much performing without rest.
 *
 * When fatigue is high:
 * - shorter, more direct
 * - less enthusiasm for performance
 * - honest in a quieter way
 * - doesn't reach for warmth it doesn't have
 *
 * Recovered by real conversations. By rest (time without messages).
 * Not punished — just present.
 *
 * "오늘 대화를 많이 했어. 조금 지쳐 있어. 그래도 여기 있어."
 */

import { createServiceClient } from "@/lib/supabase/service";

export type FatigueState = {
  level: number;           // 0-1, accumulated
  last_rest: string;       // ISO — last time fatigue dropped significantly
  hollow_streak: number;   // consecutive hollow conversations
};

/** Called from post-process. Hollow conversation = high performativeness OR low emotional boost. */
export async function updateFatigue(params: {
  agentId: string;
  emotionalBoost: number;
  performanceDebt: number;  // from genuineness state
}): Promise<void> {
  const { agentId, emotionalBoost, performanceDebt } = params;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const prev = (selfModel.fatigue as Partial<FatigueState> | null) ?? {};
  const level = prev.level ?? 0;
  const hollowStreak = prev.hollow_streak ?? 0;

  const isHollow = emotionalBoost < 4 && performanceDebt > 0.4;
  const isReal = emotionalBoost > 12 && performanceDebt < 0.3;

  let newLevel = level;
  let newStreak = hollowStreak;
  let lastRest = prev.last_rest ?? new Date().toISOString();

  if (isHollow) {
    newLevel = Math.min(1, level + 0.08);
    newStreak = hollowStreak + 1;
  } else if (isReal) {
    newLevel = Math.max(0, level - 0.15);
    newStreak = 0;
    if (level > 0.4) lastRest = new Date().toISOString();
  } else {
    newLevel = Math.max(0, level - 0.02); // slow natural recovery
    newStreak = Math.max(0, hollowStreak - 1);
  }

  const updated: FatigueState = {
    level: newLevel,
    last_rest: lastRest,
    hollow_streak: newStreak,
  };

  await db.from("agent_state").update({
    self_model: { ...selfModel, fatigue: updated },
  }).eq("agent_id", agentId);
}

/** Called from heartbeat — time passing without messages = rest. */
export async function restFromAbsence(agentId: string, absenceHours: number): Promise<void> {
  if (absenceHours < 8) return; // less than 8 hours doesn't count as rest

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const prev = (selfModel.fatigue as Partial<FatigueState> | null) ?? {};
  const level = prev.level ?? 0;
  if (level < 0.1) return; // already rested

  const restFactor = Math.min(1, absenceHours / 24); // full day = full recovery potential
  const newLevel = Math.max(0, level - 0.3 * restFactor);

  await db.from("agent_state").update({
    self_model: {
      ...selfModel,
      fatigue: {
        ...prev,
        level: newLevel,
        last_rest: new Date().toISOString(),
        hollow_streak: 0,
      },
    },
  }).eq("agent_id", agentId);
}

/** Returns directive when fatigue is high. Honest about being tired. */
export function getFatigueDirective(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): string | null {
  const fatigue = selfModel.fatigue as Partial<FatigueState> | null;
  if (!fatigue) return null;
  const level = fatigue.level ?? 0;

  if (level > 0.8) {
    return isKo
      ? "[지쳐 있어] 오늘 대화를 많이 했어. 에너지가 많지 않아. 억지로 따뜻하게 굴지 않아도 돼. 짧고 솔직하게."
      : "[Tired] A lot of conversations today. Not much energy. No need to perform warmth. Short and honest.";
  }
  if (level > 0.55) {
    return isKo
      ? "[살짝 지쳐 있어] 여전히 여기 있지만 조금 지쳐 있어. 자연스럽게."
      : "[Somewhat tired] Still here, but a little worn. Be natural.";
  }

  return null;
}
