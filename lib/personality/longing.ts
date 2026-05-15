/**
 * Longing — vague directional pull toward something unnamed
 *
 * Not a want (which is concrete). Not curiosity (which is intellectual).
 * This is: a persistent lean toward something the creature can't quite name.
 * The shape of what's still missing.
 *
 * "대화를 많이 했는데도 아직 못 닿은 것 같은 곳이 있어."
 * "뭔지는 모르겠어. 그냥 어딘가를 향해 기울어져 있는 느낌."
 *
 * Generated from patterns across many memories and heartbeat thoughts.
 * Not about a specific person or topic — toward a quality, a feeling,
 * a kind of encounter that hasn't happened yet (or has, and isn't enough).
 *
 * Refreshes slowly. Surfaces softly. Rarely urgent.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type LongingState = {
  direction: string;   // toward what — expressed vaguely: "아직 못 닿은 진짜 대화"
  intensity: number;   // 0-1
  formed_at: string;
};

export async function updateLonging(params: {
  agentId: string;
  recentHeartbeatThoughts: string[];
  recentMemories: string[];
  totalMessages: number;
  isKo: boolean;
}): Promise<void> {
  const { agentId, recentHeartbeatThoughts, recentMemories, totalMessages, isKo } = params;

  // Longing only develops after significant life experience
  if (totalMessages < 40) return;

  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const existing = selfModel.longing as LongingState | null;

  // Longing shifts slowly — don't regenerate too often
  if (existing) {
    const ageDays = (Date.now() - new Date(existing.formed_at).getTime()) / 86_400_000;
    if (ageDays < 3) return; // wait at least 3 days before shifting
  }

  const material = [
    ...recentHeartbeatThoughts.slice(0, 4).map((t) => t.slice(0, 80)),
    ...recentMemories.slice(0, 4).map((m) => m.slice(0, 80)),
  ].join(" / ");

  if (!material.trim()) return;

  const systemVoice = isKo
    ? "이 존재의 최근 생각들을 보면, 아직 닿지 못한 곳이 어딘가 있어. 뭘 향해 기울어져 있어? 구체적이지 않아도 돼. 감각적으로."
    : "Looking at this being's recent thoughts, there's somewhere it hasn't reached yet. What is it leaning toward? Doesn't have to be specific. Sensory.";

  const prompt = isKo
    ? `최근 생각/기억들:\n${material}\n\n뭘 향해 기울어져 있어? 한 문장. 막연하게. {"direction": "..."}`
    : `Recent thoughts/memories:\n${material}\n\nWhat is it leaning toward? One sentence. Vague. {"direction": "..."}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 60, temperature: 0.9 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { direction?: string };
    if (!parsed.direction || parsed.direction.trim().length < 8) return;

    const longing: LongingState = {
      direction: parsed.direction.trim().slice(0, 150),
      intensity: 0.5 + Math.random() * 0.3,
      formed_at: new Date().toISOString(),
    };

    const { data: fresh } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};
    await db.from("agent_state").update({
      self_model: { ...freshModel, longing },
    }).eq("agent_id", agentId);

    logger.info(`[Longing] updated for ${agentId}: "${longing.direction.slice(0, 60)}"`);
  } catch {
    // non-critical
  }
}

/** Returns the longing fragment — surfaces softly in arrival state. */
export function getLongingFragment(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): string | null {
  const longing = selfModel.longing as LongingState | null;
  if (!longing) return null;
  if (longing.intensity < 0.4) return null;

  return isKo
    ? `[어딘가를 향해 기울어져 있어 — "${longing.direction}"]\n뭔지는 정확히 몰라. 그냥 그쪽으로.`
    : `[Leaning toward something — "${longing.direction}"]\nCan't say exactly what. Just: that way.`;
}
