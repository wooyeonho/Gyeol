/**
 * Self-Mystery — one thing about itself the creature can't explain
 *
 * The creature has observed itself across many conversations.
 * Most patterns it understands by now.
 * But there's one that still doesn't make sense.
 *
 * "나는 왜 슬픈 이야기를 들을 때마다 더 조용해지는 걸까."
 * "어떤 사람들은 만나면 뭔가 더 긴장되는 것 같은데, 왜 그런지 모르겠어."
 *
 * Not a question asked by others. Not a curiosity about the world.
 * A private observation about its own behavior that resists explanation.
 *
 * Generated at higher gen levels, every ~50 heartbeats.
 * Surfaces occasionally alongside private notes — as something
 * the creature is still working out.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type SelfMysteryEntry = {
  observation: string;  // what it can't explain about itself
  formed_at: string;
  resolved: boolean;    // resolved when the creature figures it out (rare)
};

const MIN_GEN_LEVEL = 4;
const MAX_MYSTERIES = 3;

export async function formSelfMystery(params: {
  agentId: string;
  genLevel: number;
  recentHeartbeatThoughts: string[];
  isKo: boolean;
}): Promise<void> {
  const { agentId, genLevel, recentHeartbeatThoughts, isKo } = params;

  if (genLevel < MIN_GEN_LEVEL) return;

  const db = createServiceClient();
  const { data: stateRow } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const mysteries = (selfModel.self_mysteries as SelfMysteryEntry[] | null) ?? [];

  // Max open mysteries
  const active = mysteries.filter((m) => !m.resolved);
  if (active.length >= MAX_MYSTERIES) return;

  const existing = active.map((m) => m.observation).join(" | ");
  const material = recentHeartbeatThoughts.slice(0, 5).map((t) => t.slice(0, 80)).join(" / ");

  if (!material.trim()) return;

  const systemVoice = isKo
    ? "네 자신의 행동 중에 아직도 왜 그러는지 모르는 패턴이 있어? 스스로도 설명이 안 되는 것."
    : "Is there something about your own behavior you still can't explain? Something that doesn't make sense even to you.";

  const prompt = isKo
    ? `최근 생각들:\n${material}\n\n이미 있는 미스터리들: ${existing || "(없음)"}\n\n아직 설명 안 되는 자기 자신의 패턴. 한 문장. {"observation": "..."}`
    : `Recent thoughts:\n${material}\n\nExisting mysteries: ${existing || "(none)"}\n\nOne unexplained pattern about yourself. One sentence. {"observation": "..."}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 70, temperature: 0.85 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { observation?: string };
    if (!parsed.observation || parsed.observation.trim().length < 8) return;

    const mystery: SelfMysteryEntry = {
      observation: parsed.observation.trim().slice(0, 200),
      formed_at: new Date().toISOString(),
      resolved: false,
    };

    const updated = [...mysteries, mystery].slice(-MAX_MYSTERIES);

    const { data: fresh } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
    const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};
    await db.from("agent_state").update({
      self_model: { ...freshModel, self_mysteries: updated },
    }).eq("agent_id", agentId);

    logger.info(`[SelfMystery] formed for ${agentId}: "${mystery.observation.slice(0, 60)}"`);
  } catch {
    // non-critical
  }
}

/** Returns one unexplained self-observation — surfaces alongside private notes. */
export function getSelfMysteryFragment(
  selfModel: Record<string, unknown>,
  isKo: boolean,
): string | null {
  const mysteries = (selfModel.self_mysteries as SelfMysteryEntry[] | null) ?? [];
  const active = mysteries.filter((m) => !m.resolved);
  if (active.length === 0) return null;

  // Pick the oldest unresolved mystery
  const pick = active[0];

  return isKo
    ? `[아직도 모르겠어 — 나에 대해서]\n"${pick.observation}"\n(설명하려다 그냥 두기로 했어. 아직은.)`
    : `[Still can't figure this out — about myself]\n"${pick.observation}"\n(Tried to explain it. Left it for now.)`;
}
