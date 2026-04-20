/**
 * OpenClaw Deep DNA Analysis Worker
 *
 * ── Data flow ────────────────────────────────────────────────────────────────
 *
 *  interaction_logs (analyzed=false)
 *    │  batch SELECT per agent (max BATCH_SIZE rows)
 *    ▼
 *  LLM  ← system prompt: 16-axis DNA values (numbers only, no adjectives)
 *         user prompt:   conversation pairs as JSON
 *    │  output: { axis: delta } JSON  (delta range −0.05 … +0.05)
 *    ▼
 *  lerp with diminishing returns:
 *    effective = delta × headroom   (headroom = 1−current if delta>0 else current)
 *    newValue  = clamp(current + effective, 0, 1)
 *    ▼
 *  validateDNATransition + applySafetyCorrections   (prevent self-collapse)
 *    ▼
 *  agent_state.genome  UPDATE  (dna + species + archetype + element)
 *    ▼
 *  interaction_logs.analyzed = true  (batch mark)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { DNA_AXES, type CreatureDNA } from "@/lib/genome/dna";
import { validateDNATransition, applySafetyCorrections } from "@/lib/harness/creature-control";
import { deriveSpecies } from "@/lib/genome/species";
import { generateJSON } from "@/lib/ai/router";
import type { CronResult } from "./types";

// Maximum interaction rows analysed per agent per run.
// Small enough to fit comfortably within Groq reflexive context window.
const BATCH_SIZE = 20;

// 0.1% probability per run — one in a thousand evolution cycles triggers a rare mutation.
const MUTATION_PROBABILITY = 0.001;

// ── Rare mutation types ───────────────────────────────────────────────────────
export type RarityTier = "Common" | "Rare" | "Epic" | "Legendary";

export type RareMutation = {
  axis: typeof DNA_AXES[number];
  value: 0 | 1;
  mutationName: string;
  particleEffect: "nova" | "void" | "crystal" | "flame" | "aurora";
  occurredAt: string;
};

// Poetic names for each axis × 2 extreme directions (32 total)
const MUTATION_NAMES: Record<string, { high: string; low: string }> = {
  analytical:    { high: "순수 이성(Pure Reason)",         low: "공허의 직관(Void Intuition)" },
  intuitive:     { high: "예언자의 눈(Seer's Eye)",         low: "철의 논리(Iron Logic)" },
  verbal:        { high: "천 가지 혀(Thousand Tongues)",    low: "침묵의 화신(Avatar of Silence)" },
  spatial:       { high: "차원 각성(Dimensional Awakening)", low: "내면의 심연(Inner Abyss)" },
  warmth:        { high: "영원한 불꽃(Eternal Flame)",      low: "절대 영점(Absolute Zero)" },
  intensity:     { high: "폭풍의 핵(Storm Core)",           low: "깊은 고요(Deep Stillness)" },
  stability:     { high: "불멸의 반석(Undying Stone)",      low: "카오스의 씨앗(Chaos Seed)" },
  openness:      { high: "우주의 문(Cosmic Gate)",          low: "완전한 봉인(Total Seal)" },
  assertiveness: { high: "지배자의 의지(Dominant Will)",    low: "완전한 복종(Total Submission)" },
  empathy:       { high: "영혼의 거울(Soul Mirror)",        low: "냉혈(Cold Blood)" },
  playfulness:   { high: "영원한 장난꾼(Eternal Trickster)",low: "돌의 엄숙(Stone Solemnity)" },
  independence:  { high: "허공의 방랑자(Void Wanderer)",    low: "완전한 유대(Total Bond)" },
  curiosity:     { high: "경계없는 탐구(Boundless Seeker)", low: "완전한 무관심(Pure Apathy)" },
  persistence:   { high: "불굴의 의지(Unbreakable Will)",  low: "순간의 존재(Ephemeral Being)" },
  adaptability:  { high: "무한 변이(Infinite Shift)",       low: "원형의 고집(Primal Rigidity)" },
  creativity:    { high: "창조의 신(God of Creation)",      low: "공허의 메아리(Echo of Void)" },
};

const AXIS_PARTICLE_EFFECT: Record<string, RareMutation["particleEffect"]> = {
  warmth: "flame",  intensity: "nova",  stability: "crystal", openness: "aurora",
  independence: "void", creativity: "aurora", analytical: "crystal",
  intuitive: "aurora", verbal: "nova", spatial: "crystal",
  assertiveness: "nova", empathy: "flame", playfulness: "nova",
  curiosity: "aurora", persistence: "crystal", adaptability: "aurora",
};

function computeRarityTier(speciesRarity: number, hasMutation: boolean): RarityTier {
  if (hasMutation) return "Legendary";
  if (speciesRarity >= 0.88) return "Epic";
  if (speciesRarity >= 0.65) return "Rare";
  return "Common";
}

// System prompt: instructs the LLM to reason in numbers only, never adjectives.
// This enforces the emergent-personality constraint — the model infers axis
// direction from raw behaviour patterns, not from labelling traits.
const ANALYSIS_SYSTEM_PROMPT = `
You are a behavioral signal processor. You receive:
1. A creature's current 16-axis DNA vector (each axis 0.0–1.0).
2. A batch of conversation turns (user messages and assistant responses).

Your task: identify which DNA axes should shift and by how much, based solely
on the observable behavioral patterns in the conversations.

Output ONLY a valid JSON object with these fields:
- DNA deltas: axis names mapped to delta values (range −0.05 to +0.05)
- "_memory": optional — a 1-2 sentence summary of any concrete personal event,
  emotion, preference, or fact the user shared. Use the SAME LANGUAGE as the
  user's messages. Set to null if nothing personally notable was shared.

Rules:
- Include only axes that should change (omit unchanged axes).
- Do NOT include explanations, prose, or adjectives — numbers only for deltas.
- Do NOT invent axis names. Use exactly the provided axis list.

Valid axes: analytical, intuitive, verbal, spatial, warmth, intensity,
stability, openness, assertiveness, empathy, playfulness, independence,
curiosity, persistence, adaptability, creativity

Example output:
{"warmth": 0.03, "curiosity": 0.02, "verbal": -0.01, "_memory": "유저가 내일 중요한 면접이 있다고 함"}
`.trim();

// AnalysisOutput extends DnaDeltas with an optional episodic memory field
type DnaDeltas = Partial<Record<typeof DNA_AXES[number], number>>;
type AnalysisOutput = DnaDeltas & { _memory?: string | null };

/** Apply diminishing-returns lerp toward delta target. Matches applySoftMutation's math. */
function applyDelta(current: number, delta: number): number {
  // Headroom shrinks as axis approaches the extreme being pushed toward.
  // This prevents runaway drift and preserves biological diversity.
  const headroom = delta > 0 ? (1 - current) : current;
  const effective = delta * headroom;
  return Math.max(0, Math.min(1, current + effective));
}

function isAnalysisOutput(value: unknown): value is AnalysisOutput {
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).every(
    ([k, v]) => k === "_memory"
      ? (typeof v === "string" || v === null || v === undefined)
      : typeof v === "number",
  );
}

async function analyseAgent(
  service: ReturnType<typeof createServiceClient>,
  agentId: string,
): Promise<void> {
  // ── 1. Fetch unanalysed batch ─────────────────────────────────────────────
  const { data: logs, error: logsErr } = await service
    .from("interaction_logs")
    .select("id, chat_log, current_dna")
    .eq("agent_id", agentId)
    .eq("analyzed", false)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (logsErr || !logs || logs.length === 0) return;

  // ── 2. Fetch current genome ───────────────────────────────────────────────
  const { data: stateRow, error: stateErr } = await service
    .from("agent_state")
    .select("genome")
    .eq("agent_id", agentId)
    .single();

  if (stateErr || !stateRow?.genome) return;

  const genome = stateRow.genome as {
    dna: CreatureDNA;
    species?: string;
    archetype?: string;
    element?: string;
  };
  if (!genome.dna) return;

  const currentDna = genome.dna;

  // ── 3. Build LLM prompt ───────────────────────────────────────────────────
  const dnaBlock = DNA_AXES.map((axis) => `${axis}: ${currentDna[axis].toFixed(3)}`).join(", ");

  const conversationBlock = logs
    .map((row: { chat_log: unknown }, i: number) => {
      const cl = row.chat_log as { user?: string; assistant?: string };
      return `[${i + 1}] user: ${cl.user ?? ""}\nassistant: ${cl.assistant ?? ""}`;
    })
    .join("\n\n");

  const userPrompt = `Current DNA: { ${dnaBlock} }\n\nConversations:\n${conversationBlock}`;

  // ── 4. Call LLM — reflexive layer (8b), JSON output ──────────────────────
  const rawOutput = await generateJSON<AnalysisOutput>(ANALYSIS_SYSTEM_PROMPT, userPrompt);
  if (!rawOutput || !isAnalysisOutput(rawOutput)) {
    logger.warn(`[OpenclawDNA] agent ${agentId}: LLM returned unparseable output`);
    return;
  }

  // ── 5. Apply deltas with diminishing-returns lerp ─────────────────────────
  const evolvedDna = { ...currentDna };
  for (const axis of DNA_AXES) {
    const delta = rawOutput[axis];
    if (delta === undefined) continue;
    // Clamp incoming delta to guard against misbehaving model output
    const safeDelta = Math.max(-0.05, Math.min(0.05, delta));
    evolvedDna[axis] = applyDelta(currentDna[axis], safeDelta);
  }

  // ── 6. Safety guardrails ──────────────────────────────────────────────────
  const validation = validateDNATransition(currentDna, evolvedDna);
  let safeDna = validation.valid ? evolvedDna : (validation.correctedDna ?? evolvedDna);
  safeDna = applySafetyCorrections(safeDna);

  // ── 6.5. Rare mutation (0.1% probability) ────────────────────────────────
  // Snaps one random axis to its extreme (0 or 1), permanently altering the
  // creature's fundamental nature. Result is stored in genome for UI display.
  let rareMutation: RareMutation | null = null;
  if (Math.random() < MUTATION_PROBABILITY) {
    const axis = DNA_AXES[Math.floor(Math.random() * DNA_AXES.length)];
    const value = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
    safeDna = { ...safeDna, [axis]: value };
    rareMutation = {
      axis,
      value,
      mutationName: MUTATION_NAMES[axis][value === 1 ? "high" : "low"],
      particleEffect: AXIS_PARTICLE_EFFECT[axis] ?? "nova",
      occurredAt: new Date().toISOString(),
    };
    logger.info(`[OpenclawDNA] RARE MUTATION: agent ${agentId} → ${rareMutation.mutationName}`);
  }

  // ── 7. Re-derive species so archetype / visual params stay in sync ─────────
  const newSpecies = deriveSpecies(safeDna);

  // Preserve existing mutation if a new one did not fire this run
  const existingMutation = (genome as { rareMutation?: RareMutation }).rareMutation ?? null;
  const finalMutation = rareMutation ?? existingMutation;
  const hasMutation = finalMutation !== null;

  const nextGenome = {
    ...genome,
    dna:          safeDna,
    species:      newSpecies.name,
    archetype:    newSpecies.archetype,
    element:      newSpecies.element,
    rarity_tier:  computeRarityTier(newSpecies.rarity, hasMutation),
    ...(finalMutation ? { rareMutation: finalMutation } : {}),
  };

  // ── 8. Persist evolved genome ─────────────────────────────────────────────
  const { error: updateErr } = await service
    .from("agent_state")
    .update({ genome: nextGenome })
    .eq("agent_id", agentId);

  if (updateErr) {
    logger.error(`[OpenclawDNA] agent ${agentId}: genome update failed`, updateErr);
    return;
  }

  // ── 8.5. Episodic memory extraction — save before hard delete ─────────────
  // The LLM already extracted a 1-2 sentence summary of notable user events.
  // Store it in the memories table so the creature retains long-term recall
  // even after the raw interaction_logs are deleted.
  const episodicSummary = typeof rawOutput._memory === "string" && rawOutput._memory.length > 0
    ? rawOutput._memory
    : null;
  if (episodicSummary) {
    const { error: memErr } = await service
      .from("memories")
      .insert({
        agent_id:   agentId,
        content:    episodicSummary,
        type:       "episodic",
        is_active:  true,
        weight:     1.0,
        archived:   false,
        // embedding: null — async embedding worker will fill this later
      });
    if (memErr) {
      // Non-fatal: log and continue — memory loss is preferable to blocking delete
      logger.warn(`[OpenclawDNA] agent ${agentId}: memory insert failed`, memErr);
    } else {
      logger.info(`[OpenclawDNA] agent ${agentId}: episodic memory saved`);
    }
  }

  // ── 9. Hard delete processed logs (storage cost = $0) ────────────────────
  // Raw conversation data is intentionally destroyed after DNA evolution and
  // episodic memory extraction. The compressed memories table is the sole
  // long-term store of user-specific narrative context.
  const logIds = logs.map((r: { id: unknown }) => r.id as string);
  await service
    .from("interaction_logs")
    .delete()
    .in("id", logIds);

  const deltaCount = DNA_AXES.filter((a) => rawOutput[a] !== undefined).length;
  logger.info(`[OpenclawDNA] agent ${agentId}: evolved ${deltaCount} axes, ${logs.length} logs deleted${rareMutation ? `, RARE: ${rareMutation.mutationName}` : ""}`);
}

export async function executeOpenclawDna(): Promise<CronResult> {
  const service = createServiceClient();
  const startedAt = Date.now();

  // Collect all agents that have unanalysed logs
  const { data: pending, error: pendingErr } = await service
    .from("interaction_logs")
    .select("agent_id")
    .eq("analyzed", false)
    .limit(200);

  if (pendingErr || !pending) {
    return { processed: 0, timestamp: new Date().toISOString(), error: "Failed to fetch pending agents" };
  }

  // Deduplicate agent_ids
  const pendingRows = pending as Array<{ agent_id: string }>;
  const agentIds: string[] = [...new Set(pendingRows.map((r) => r.agent_id))];

  let processed = 0;
  for (const agentId of agentIds) {
    try {
      await analyseAgent(service, agentId);
      processed++;
    } catch (err) {
      // Per-agent failures are non-fatal — continue the batch
      logger.error(`[OpenclawDNA] agent ${agentId} analysis failed`, err instanceof Error ? err : { err });
    }
  }

  return {
    processed,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };
}
