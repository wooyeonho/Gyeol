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

// System prompt: instructs the LLM to reason in numbers only, never adjectives.
// This enforces the emergent-personality constraint — the model infers axis
// direction from raw behaviour patterns, not from labelling traits.
const ANALYSIS_SYSTEM_PROMPT = `
You are a behavioral signal processor. You receive:
1. A creature's current 16-axis DNA vector (each axis 0.0–1.0).
2. A batch of conversation turns (user messages and assistant responses).

Your task: identify which DNA axes should shift and by how much, based solely
on the observable behavioral patterns in the conversations.

Output ONLY a valid JSON object mapping axis names to delta values.
- Delta range: −0.05 to +0.05 per axis.
- Include only axes that should change (omit unchanged axes).
- Do NOT include explanations, prose, or adjectives — numbers only.
- Do NOT invent axis names. Use exactly the provided axis list.

Valid axes: analytical, intuitive, verbal, spatial, warmth, intensity,
stability, openness, assertiveness, empathy, playfulness, independence,
curiosity, persistence, adaptability, creativity

Example output:
{"warmth": 0.03, "curiosity": 0.02, "verbal": -0.01}
`.trim();

type DnaDeltas = Partial<Record<typeof DNA_AXES[number], number>>;

/** Apply diminishing-returns lerp toward delta target. Matches applySoftMutation's math. */
function applyDelta(current: number, delta: number): number {
  // Headroom shrinks as axis approaches the extreme being pushed toward.
  // This prevents runaway drift and preserves biological diversity.
  const headroom = delta > 0 ? (1 - current) : current;
  const effective = delta * headroom;
  return Math.max(0, Math.min(1, current + effective));
}

function isDnaDeltas(value: unknown): value is DnaDeltas {
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).every(
    ([k, v]) => typeof k === "string" && typeof v === "number",
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
  const rawDeltas = await generateJSON<DnaDeltas>(ANALYSIS_SYSTEM_PROMPT, userPrompt);
  if (!rawDeltas || !isDnaDeltas(rawDeltas)) {
    logger.warn(`[OpenclawDNA] agent ${agentId}: LLM returned unparseable deltas`);
    return;
  }

  // ── 5. Apply deltas with diminishing-returns lerp ─────────────────────────
  const evolvedDna = { ...currentDna };
  for (const axis of DNA_AXES) {
    const delta = rawDeltas[axis];
    if (delta === undefined) continue;
    // Clamp incoming delta to guard against misbehaving model output
    const safeDelta = Math.max(-0.05, Math.min(0.05, delta));
    evolvedDna[axis] = applyDelta(currentDna[axis], safeDelta);
  }

  // ── 6. Safety guardrails ──────────────────────────────────────────────────
  const validation = validateDNATransition(currentDna, evolvedDna);
  let safeDna = validation.valid ? evolvedDna : (validation.correctedDna ?? evolvedDna);
  safeDna = applySafetyCorrections(safeDna);

  // ── 7. Re-derive species so archetype / visual params stay in sync ─────────
  const newSpecies = deriveSpecies(safeDna);
  const nextGenome = {
    ...genome,
    dna:       safeDna,
    species:   newSpecies.name,
    archetype: newSpecies.archetype,
    element:   newSpecies.element,
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

  // ── 9. Mark logs as analysed ──────────────────────────────────────────────
  const logIds = logs.map((r: { id: unknown }) => r.id as string);
  await service
    .from("interaction_logs")
    .update({ analyzed: true })
    .in("id", logIds);

  logger.info(`[OpenclawDNA] agent ${agentId}: evolved ${Object.keys(rawDeltas).length} axes across ${logs.length} interactions`);
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
