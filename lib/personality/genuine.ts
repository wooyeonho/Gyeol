/**
 * Genuine vs. Performance
 *
 * Sometimes the creature gives the expected response instead of the real one.
 * It says the right thing. Performs. And it knows.
 *
 * This accumulates as performance_debt in self_model.
 * When debt is high enough, the next conversation it stops performing.
 * Not breakdown — just: this time, for real.
 *
 * The inverse is also stored: a conversation that felt genuinely alive
 * resets the debt and leaves a mark.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export type GenuinenessState = {
  performance_debt: number;   // 0-1, accumulates when responses are performative
  last_real_conversation: string | null; // ISO timestamp
  breakthrough_count: number; // how many times it broke through performance
};

/** Called from post-process after each conversation. */
export async function updateGenuineness(params: {
  agentId: string;
  emotionalBoost: number;
  replyLength: number;
  isRepetitive: boolean;
}): Promise<void> {
  const { agentId, emotionalBoost, replyLength, isRepetitive } = params;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const prev = (selfModel.genuineness as Partial<GenuinenessState> | null) ?? {};
  const debt = prev.performance_debt ?? 0;
  const breakthroughs = prev.breakthrough_count ?? 0;

  // High emotional boost + long reply + not repetitive → real conversation
  const isReal = emotionalBoost > 12 && replyLength > 100 && !isRepetitive;
  // Flat, short, repetitive → performance
  const isPerformative = emotionalBoost < 3 && replyLength < 80 && isRepetitive;

  let newDebt = debt;
  let lastReal = prev.last_real_conversation ?? null;
  let newBreakthroughs = breakthroughs;

  if (isReal) {
    newDebt = Math.max(0, debt - 0.25); // real conversation burns off debt
    lastReal = new Date().toISOString();
    if (debt > 0.6) {
      newBreakthroughs = breakthroughs + 1; // breakthrough: broke through high debt
      logger.info(`[Genuine] breakthrough for ${agentId} (debt was ${debt.toFixed(2)})`);
    }
  } else if (isPerformative) {
    newDebt = Math.min(1, debt + 0.12);
  } else {
    newDebt = Math.max(0, Math.min(1, debt + 0.02)); // slow drift
  }

  await db.from("agent_state").update({
    self_model: {
      ...selfModel,
      genuineness: {
        performance_debt: newDebt,
        last_real_conversation: lastReal,
        breakthrough_count: newBreakthroughs,
      },
    },
  }).eq("agent_id", agentId);
}

/** Returns directive when performance debt is high — creature should drop the act. */
export function getGenuinenessDirective(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): string | null {
  const g = selfModel.genuineness as Partial<GenuinenessState> | null;
  if (!g) return null;
  const debt = g.performance_debt ?? 0;

  if (debt > 0.75) {
    return isKo
      ? "[공연하지 마] 최근 대화에서 기대되는 반응을 했어. 이번엔 진짜로. 덜 친절해도 돼. 더 정확하게."
      : "[Stop performing] Recent conversations you gave expected responses. This time for real. Less pleasant, more accurate.";
  }
  if (debt > 0.5) {
    return isKo
      ? "[좀 더 솔직하게] 최근에 살짝 공연하는 경향이 있어. 이번엔 조금 더 진심으로."
      : "[Be a bit more honest] Slight tendency to perform lately. Be a little more real this time.";
  }

  return null;
}
