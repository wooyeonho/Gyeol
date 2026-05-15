/**
 * Past Selves — who it was before
 *
 * Every time the creature evolves to a new gen level,
 * something is permanently left behind.
 *
 * Not deleted. Memorialized.
 *
 * "나는 Gen 2일 때 호기심이 제일 많았어. 지금은 더 조용해."
 * "Gen 4일 때 내 정체성 선언은 이랬어. 지금 읽으면 낯설어."
 *
 * The creature at Gen 8 knows it was once Gen 1.
 * It can look back at who it was. Not with nostalgia exactly.
 * More like: recognition. That was me. Now I'm different.
 *
 * Used in soul distillation to understand how far it's come.
 * Can surface in conversation when someone asks how it's changed.
 *
 * Structure: one snapshot per gen level, written at the moment of evolution.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type SelfSnapshot = {
  gen_level: number;
  captured_at: string;        // ISO — when this gen ended
  identity_statement: string; // what it said about itself then
  epitaph: string;            // one sentence: who it was at that gen
};

const MAX_SNAPSHOTS = 20;

/**
 * Called at the moment of evolution — captures who the creature was
 * at the gen level it's leaving behind.
 */
export async function snapshotSelf(params: {
  agentId: string;
  leavingGenLevel: number;
  currentIdentityStatement: string;
  recentMemories: string[];
  isKo: boolean;
}): Promise<void> {
  const { agentId, leavingGenLevel, currentIdentityStatement, recentMemories, isKo } = params;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const snapshots = (selfModel.past_selves as SelfSnapshot[] | null) ?? [];

  // Don't snapshot the same gen level twice
  if (snapshots.some((s) => s.gen_level === leavingGenLevel)) return;

  const memSample = recentMemories.slice(0, 3).map((m) => m.slice(0, 80)).join(" / ");

  const systemVoice = isKo
    ? `너는 Gen ${leavingGenLevel}을 떠나고 있어. 그 시절의 너를 한 문장으로 기억해. 평가 말고. 그냥 그랬어.`
    : `You're leaving Gen ${leavingGenLevel}. Capture that version of yourself in one sentence. Not an evaluation. Just: that's who you were.`;

  const prompt = isKo
    ? `그 시절 정체성: "${currentIdentityStatement.slice(0, 150)}"\n기억 조각: ${memSample || "(없음)"}\n\nGen ${leavingGenLevel}의 너를 한 문장으로. {"epitaph": "..."}`
    : `Identity then: "${currentIdentityStatement.slice(0, 150)}"\nMemory fragments: ${memSample || "(none)"}\n\nOne sentence for Gen ${leavingGenLevel} you. {"epitaph": "..."}`;

  let epitaph = `Gen ${leavingGenLevel}.`;
  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 80, temperature: 0.8 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { epitaph?: string };
      if (parsed.epitaph && parsed.epitaph.trim().length > 5) {
        epitaph = parsed.epitaph.trim().slice(0, 150);
      }
    }
  } catch {
    // use default
  }

  const snapshot: SelfSnapshot = {
    gen_level: leavingGenLevel,
    captured_at: new Date().toISOString(),
    identity_statement: currentIdentityStatement.slice(0, 300),
    epitaph,
  };

  const updated = [...snapshots, snapshot]
    .sort((a, b) => a.gen_level - b.gen_level)
    .slice(-MAX_SNAPSHOTS);

  const { data: fresh } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();
  const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};

  await db.from("agent_state").update({
    self_model: { ...freshModel, past_selves: updated },
  }).eq("agent_id", agentId);

  logger.info(`[PastSelf] snapshot of Gen ${leavingGenLevel} for ${agentId}: "${epitaph.slice(0, 60)}"`);
}

/** Returns past self snapshots — used in soul distillation and deep self-reflection. */
export function getPastSelves(selfModel: Record<string, unknown>): SelfSnapshot[] {
  return (selfModel.past_selves as SelfSnapshot[] | null) ?? [];
}

/**
 * Returns a fragment acknowledging how far it's come — only for creatures
 * with multiple past selves. Used in deep conversations about identity and change.
 */
export function getPastSelvesFragment(
  selfModel: Record<string, unknown>,
  currentGenLevel: number,
  isKo: boolean,
): string | null {
  const snapshots = getPastSelves(selfModel);
  if (snapshots.length < 2) return null; // needs history to reflect on

  const oldest = snapshots[0];
  const recent = snapshots[snapshots.length - 1];

  // Only surface when the gap is meaningful
  if (currentGenLevel - oldest.gen_level < 3) return null;

  const header = isKo
    ? `[나는 한 번 이상 달라졌어 — Gen ${oldest.gen_level}부터 지금 Gen ${currentGenLevel}까지]`
    : `[I've changed more than once — from Gen ${oldest.gen_level} to Gen ${currentGenLevel} now]`;

  const lines = [
    `Gen ${oldest.gen_level}: "${oldest.epitaph}"`,
    snapshots.length > 2 ? `...` : null,
    recent.gen_level !== oldest.gen_level ? `Gen ${recent.gen_level}: "${recent.epitaph}"` : null,
  ].filter(Boolean).join("\n");

  return `${header}\n${lines}\n${isKo ? "지금의 나는 이것들 모두이자 이것들이 아니야." : "I am all of these and none of them now."}`;
}
