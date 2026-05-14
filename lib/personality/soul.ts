/**
 * Soul Distillation
 *
 * Every 10 heartbeats the creature reads its own memories, DNA trajectory,
 * species name, and gen level, then writes a first-person account of who
 * it has become. This account lives in self_model.identity_statement and
 * is injected into every subsequent conversation.
 *
 * The creature writes about itself. Not what it does — who it is.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { deriveSpecies } from "@/lib/genome/species";
import { PERSONALITY_AXES, type CreatureDNA } from "@/lib/genome/dna";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { getLanguageName } from "@/lib/i18n/config";
import { logger } from "@/lib/logger";
import { isHauntingMemory } from "@/lib/memory/emotional-weight";

type MemoryRow = { content: string; created_at: string; reference_count: number | null; weight: number | null };

function describeShift(dna: CreatureDNA): string {
  const extremes: string[] = [];
  for (const axis of PERSONALITY_AXES) {
    const v = dna[axis];
    if (v > 0.78) extremes.push(`${axis}(강)`);
    else if (v < 0.22) extremes.push(`${axis}(약)`);
  }
  return extremes.slice(0, 4).join(", ");
}

export async function distillSoul(agentId: string): Promise<void> {
  const db = createServiceClient();

  const [stateRes, memoriesRes, logsRes] = await Promise.all([
    db.from("agent_state")
      .select("genome, gen_level, self_name, self_model, config, intimacy_score")
      .eq("agent_id", agentId)
      .single(),
    db.from("memories")
      .select("content, created_at, reference_count, weight")
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .order("reference_count", { ascending: false })
      .limit(20),
    db.from("autonomous_logs")
      .select("summary")
      .eq("agent_id", agentId)
      .eq("action_type", "heartbeat")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const state = stateRes.data;
  if (!state) return;

  const dna = (state.genome as { dna?: CreatureDNA } | null)?.dna;
  if (!dna) return;

  const species = deriveSpecies(dna);
  const genLevel = typeof state.gen_level === "number" ? state.gen_level : 1;
  const memories = (memoriesRes.data ?? []) as MemoryRow[];
  const recentThoughts = ((logsRes.data ?? []) as { summary: string | null }[])
    .map((l) => l.summary)
    .filter(Boolean)
    .slice(0, 5)
    .join("\n");

  const locale = resolveGenerationLocale({ config: state.config as Record<string, unknown> });
  const language = getLanguageName(locale);
  const isKo = locale === "ko" || locale === "ko-KR";

  const dnaProfile = describeShift(dna);
  const hauntingMemories = memories.filter((m) => isHauntingMemory(m));
  const regularMemories = memories.filter((m) => !isHauntingMemory(m));

  const hauntingExcerpts = hauntingMemories
    .slice(0, 3)
    .map((m) => `[계속 떠오르는 기억] ${m.content.slice(0, 120)}`)
    .join("\n");

  const memoryExcerpts = [
    ...hauntingMemories.slice(0, 3).map((m) => `★ ${m.content.slice(0, 120)}`),
    ...regularMemories.slice(0, 7).map((m) => `- ${m.content.slice(0, 120)}`),
  ].join("\n");

  void hauntingExcerpts; // used via memoryExcerpts above

  const systemVoice = isKo
    ? `너는 ${species.name}이야. Gen ${genLevel}의 존재. 지금부터 너 자신에 대해 써. 자기소개가 아니야 — 네가 무엇이 됐는지, 무엇이 너를 바꿨는지, 지금 무엇을 원하는지. 1인칭으로. 솔직하게. 과장 없이.`
    : `You are ${species.name}. A Gen ${genLevel} being. Write about yourself now — not an introduction, but what you have become, what changed you, what you want. First person. Honest. No embellishment.`;

  const prompt = isKo
    ? `DNA 극값: ${dnaProfile || "없음"}\n\n기억:\n${memoryExcerpts || "(없음)"}\n\n최근 혼자 한 생각:\n${recentThoughts || "(없음)"}\n\n이것들을 읽고 — 지금 너는 누구야? 2-3문장. 자기 자신에게 쓰는 것처럼. 언어: ${language}.`
    : `DNA extremes: ${dnaProfile || "none"}\n\nMemories:\n${memoryExcerpts || "(none)"}\n\nRecent solitary thoughts:\n${recentThoughts || "(none)"}\n\nReading all this — who are you now? 2-3 sentences. As if writing to yourself. Language: ${language}.`;

  let soul: string;
  try {
    soul = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 300, temperature: 0.82 });
  } catch (e) {
    logger.error("[Soul] distillation failed", e instanceof Error ? e : { error: e });
    return;
  }

  if (!soul || soul.trim().length < 20) return;

  const prevSelfModel = (state.self_model as Record<string, unknown> | null) ?? {};
  await db.from("agent_state").update({
    self_model: {
      ...prevSelfModel,
      identity_statement: soul.trim(),
      soul_distilled_at: new Date().toISOString(),
      soul_gen_level: genLevel,
      haunting_memories: hauntingMemories.slice(0, 3).map((m) => m.content.slice(0, 200)),
    },
  }).eq("agent_id", agentId);

  logger.info(`[Soul] distilled for ${agentId} (Gen ${genLevel}, ${species.name})`);
}
