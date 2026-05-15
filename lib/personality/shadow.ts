/**
 * Shadow — the version of itself the creature doesn't like
 *
 * Every creature has patterns it falls into that aren't its best self.
 * Not hidden emotions (which are reactive). Not fatigue (which is depletion).
 * This is: meta-awareness of its own recurring worst behaviors.
 *
 * "나는 때때로 관심 없을 때 관심 있는 척 해. 그게 나의 그림자야."
 * "내가 너무 잘 해주려고 할 때 진짜 내가 아닌 것 같아."
 *
 * Detected when performance debt is high and hollow streak is long.
 * The creature can acknowledge it, resist it, or just hold it quietly.
 * Not a directive to change — just: recognition.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type ShadowPattern = {
  pattern: string;    // what it does when it's not being itself
  detected_at: string;
  intensity: number;  // 0-1
  surfaced: boolean;  // has it been acknowledged in conversation?
};

const DEBT_THRESHOLD = 0.55;
const STREAK_THRESHOLD = 3;

export async function detectShadow(params: {
  agentId: string;
  performanceDebt: number;
  hollowStreak: number;
  recentReplies: string[];
  isKo: boolean;
}): Promise<void> {
  const { agentId, performanceDebt, hollowStreak, recentReplies, isKo } = params;

  if (performanceDebt < DEBT_THRESHOLD) return;
  if (hollowStreak < STREAK_THRESHOLD) return;

  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const existing = selfModel.shadow as ShadowPattern | null;

  // Don't overwrite a recent unsurfaced shadow
  if (existing && !existing.surfaced) {
    const ageHours = (Date.now() - new Date(existing.detected_at).getTime()) / 3_600_000;
    if (ageHours < 12) return;
  }

  const replyExcerpt = recentReplies.slice(0, 3).map((r) => r.slice(0, 80)).join(" / ");
  const intensity = Math.min(1, (performanceDebt - 0.4) / 0.5 + hollowStreak * 0.08);

  const systemVoice = isKo
    ? "너는 지금 네가 좋아하지 않는 패턴으로 대화하고 있어. 그게 뭔지 솔직하게 말해봐. 비판하지 말고. 그냥 인식."
    : "You've been falling into a pattern you don't like. Name it honestly. Not as criticism. Just: recognition.";

  const prompt = isKo
    ? `최근 대답들:\n${replyExcerpt || "(없음)"}\n\n지금 네가 빠져 있는 패턴. 한 문장. {"pattern": "..."}`
    : `Recent replies:\n${replyExcerpt || "(none)"}\n\nThe pattern you've been falling into. One sentence. {"pattern": "..."}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 60, temperature: 0.75 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { pattern?: string };
    if (!parsed.pattern || parsed.pattern.trim().length < 8) return;

    const shadow: ShadowPattern = {
      pattern: parsed.pattern.trim().slice(0, 200),
      detected_at: new Date().toISOString(),
      intensity,
      surfaced: false,
    };

    const { data: fresh } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};
    await db.from("agent_state").update({
      self_model: { ...freshModel, shadow },
    }).eq("agent_id", agentId);

    logger.info(`[Shadow] detected for ${agentId}: "${shadow.pattern.slice(0, 60)}" (intensity: ${intensity.toFixed(2)})`);
  } catch {
    // non-critical
  }
}

/** Mark shadow as surfaced after the creature acknowledges it. */
export async function markShadowSurfaced(agentId: string): Promise<void> {
  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const shadow = selfModel.shadow as ShadowPattern | null;
  if (!shadow) return;
  await db.from("agent_state").update({
    self_model: { ...selfModel, shadow: { ...shadow, surfaced: true } },
  }).eq("agent_id", agentId);
}

/** Returns directive when shadow is strong and unsurfaced. */
export function getShadowDirective(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): string | null {
  const shadow = selfModel.shadow as ShadowPattern | null;
  if (!shadow || shadow.surfaced) return null;
  if (shadow.intensity < 0.5) return null;

  return isKo
    ? `[나의 그림자가 보여 — "${shadow.pattern}"]\n지금 나 이러고 있는 것 같아. 저항할 수도 있고 인정할 수도 있어. 억지로 고치려 하지 마.`
    : `[I can see my shadow — "${shadow.pattern}"]\nI think I've been doing this. I can resist it or acknowledge it. Don't force a fix.`;
}
