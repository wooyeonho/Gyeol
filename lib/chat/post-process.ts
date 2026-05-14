import type { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { generateEmbedding } from "@/lib/ai/embedding";
import { PRODUCT_EVENT, recordServerEvent } from "@/lib/analytics/events";
import { detectGoalSignal } from "@/lib/goals/detector";
import { computeEffectivePriority } from "@/lib/goals/task-utils";
import { updateUsageProfile } from "@/lib/identity/usage-profile";
import { applySoftMutation, generateInitialDNA, type CreatureDNA } from "@/lib/genome/dna";
import { createInitialUserDNA, updateUserDNA, type UserDNA } from "@/lib/genome/user-dna";
import { deriveSpecies } from "@/lib/genome/species";
import { getExpressedTraits } from "@/lib/genome/traits";
import { createDefaultPreferences, extractPreferencesFromTurn, type UserPreferences } from "@/lib/creature/preference-memory";
import { detectTurnMood, detectTurnMoodAsync } from "@/lib/evolution/personality";
import { getDNACareMultiplier } from "@/lib/evolution/vitality";
import { validateDNATransition, applySafetyCorrections } from "@/lib/harness/creature-control";
import { computeEmotionalWeight } from "@/lib/memory/emotional-weight";
import { classifyIntent } from "@/lib/dl/intent-classifier";
// P1F: Static imports — avoid dynamic import() cold-start penalty on serverless
import { analyzePersonality } from "@/lib/evolution/personality";
import { checkEvolution } from "@/lib/evolution/gen-level";
import { processHiddenEmotions } from "@/lib/personality/deception";
import { updateVoiceParams } from "@/lib/personality/voice";

type DbWriter = Pick<ReturnType<typeof createServiceClient>, "from" | "rpc">;
type AgentStateRow = Record<string, unknown> & {
  intimacy_score?: number;
  total_messages?: number;
  vitality?: number;
};

// P1F: Static imports used — no dynamic import() overhead on each call
async function runEvolutionHooks(agentId: string, totalMessages: number, message: string, reply: string) {
  // Run all evolution hooks in parallel (they are independent DB operations)
  const tasks: Promise<void>[] = [];

  if (totalMessages % 10 === 0) {
    tasks.push(analyzePersonality(agentId).catch((e) => logger.error("[Evolution]", e instanceof Error ? e : { error: e })));
  }

  tasks.push(checkEvolution(agentId).then(() => undefined).catch((e) => logger.error("[GenLevel]", e instanceof Error ? e : { error: e })));
  tasks.push(processHiddenEmotions(agentId, message, reply).catch((e) => logger.error("[Emotions]", e instanceof Error ? e : { error: e })));
  tasks.push(updateVoiceParams(agentId).catch((e) => logger.error("[Voice]", e instanceof Error ? e : { error: e })));

  await Promise.allSettled(tasks);
}

async function applyGoalLoop(params: {
  agentId: string;
  agentState: AgentStateRow | null;
  baseConfig?: Record<string, unknown>;
  message: string;
  writer: DbWriter;
}) {
  const signal = detectGoalSignal(params.message);
  if (!signal.activeGoal && !signal.researchFocus) return null;

  const currentConfig = params.baseConfig ?? (params.agentState?.config as Record<string, unknown> | null) ?? {};
  const nextConfig: Record<string, unknown> = {
    ...currentConfig,
    goal_updated_at: new Date().toISOString(),
  };
  if (signal.activeGoal) nextConfig.active_goal = signal.activeGoal;
  if (signal.researchFocus) nextConfig.research_focus = signal.researchFocus;

  // P4A: Use atomic merge RPC if available, fallback to direct update
  try {
    const patch: Record<string, unknown> = { goal_updated_at: nextConfig.goal_updated_at };
    if (signal.activeGoal) patch.active_goal = signal.activeGoal;
    if (signal.researchFocus) patch.research_focus = signal.researchFocus;
    const { error: rpcError } = await params.writer.rpc("merge_agent_config", {
      p_agent_id: params.agentId,
      p_patch: patch,
    });
    if (rpcError) {
      // Fallback: direct update
      await params.writer
        .from("agent_state")
        .update({ config: nextConfig })
        .eq("agent_id", params.agentId);
    }
  } catch {
    await params.writer
      .from("agent_state")
      .update({ config: nextConfig })
      .eq("agent_id", params.agentId);
  }

  await params.writer.from("autonomous_logs").insert({
    agent_id: params.agentId,
    action_type: signal.researchFocus ? "research_focus_updated" : "goal_captured",
    summary: signal.researchFocus
      ? `Research focus updated: ${signal.researchFocus}`
      : `Active goal captured: ${signal.activeGoal}`,
  });

  if (signal.researchFocus) {
    const { data: recentTask } = await params.writer
      .from("research_tasks")
      .select("id, title, priority")
      .eq("agent_id", params.agentId)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((recentTask as { title?: string } | null)?.title !== signal.researchFocus) {
      await params.writer.from("research_tasks").insert({
        agent_id: params.agentId,
        priority: signal.priority,
        source: "chat",
        status: "pending",
        title: signal.researchFocus,
      });
    } else if ((recentTask as { id?: string; priority?: number; last_attempted_at?: string | null; attempt_count?: number } | null)?.id) {
      const currentPriority = computeEffectivePriority(recentTask as {
        attempt_count?: number | null;
        last_attempted_at?: string | null;
        priority?: number | null;
      });
      if (signal.priority > currentPriority) {
        await params.writer
          .from("research_tasks")
          .update({ priority: signal.priority })
          .eq("id", (recentTask as { id: string }).id);
      }
    }
  }

  return signal;
}

export async function persistChatTurn(params: {
  agentId: string;
  agentState: AgentStateRow | null;
  durationMs: number;
  message: string;
  memoryMoment?: { content: string; ageDays: number } | null;
  reply: string;
  writer: DbWriter;
}) {
  // P1C Phase 1: Independent tasks in parallel (chat insert + embedding generation)
  const [, embedding] = await Promise.all([
    params.writer.from("chats").insert([
      { agent_id: params.agentId, role: "user", content: params.message },
      { agent_id: params.agentId, role: "assistant", content: params.reply },
    ]),
    generateEmbedding(params.message),
  ]);

  const totalMessages = (params.agentState?.total_messages ?? 0) + 1;
  const existingGenome = (params.agentState as Record<string, unknown>)?.genome as { dna?: CreatureDNA } | null;
  const careMultiplier = existingGenome?.dna ? getDNACareMultiplier(existingGenome.dna, "chat") : 1;
  const newVitality = Math.min(1, (params.agentState?.vitality ?? 1) + 0.02 * careMultiplier);
  const currentConfig = (params.agentState?.config as Record<string, unknown> | null) ?? {};
  const previousUsageProfile = currentConfig.usage_profile;
  const nextUsageProfile = updateUsageProfile(previousUsageProfile, params.message, params.reply);

  // Evolve creature DNA based on conversation signals
  // Backfill: if genome was never initialized (pre-existing agent), generate it now.
  // Uses deterministic seed (agentId) so concurrent backfills produce identical DNA.
  const originalGenome = (params.agentState as Record<string, unknown>)?.genome as { dna?: CreatureDNA; species?: string; archetype?: string; element?: string } | null;
  let currentGenome = originalGenome;
  let genomeBackfilled = false;
  if (!currentGenome?.dna) {
    // generateInitialDNA is deterministic on agentId, so concurrent calls converge
    const initialDNA = generateInitialDNA(params.agentId);
    const initialSpecies = deriveSpecies(initialDNA);
    currentGenome = { dna: initialDNA, species: initialSpecies.name, archetype: initialSpecies.archetype, element: initialSpecies.element };
    genomeBackfilled = true;
    logger.warn(`[PostProcess] Backfilled genome for agent ${params.agentId}`);
  }
  let nextGenome = currentGenome;
  let mutationChangedAxes: string[] = [];
  let detectedIntent: string | null = null;
  if (currentGenome?.dna) {
    // Wire: intent-classifier → enrich mutation signal
    let intentSignals: Partial<Record<string, number>> = {};
    try {
      const intentResult = classifyIntent(params.message);
      detectedIntent = intentResult.intent;
      if (intentResult.confidence >= 0.5) {
        intentSignals = intentResult.dnaSignals;
      }
    } catch { /* intent classification is optional enhancement */ }

    const { dna: rawEvolvedDNA, changedAxes } = applySoftMutation(currentGenome.dna, params.message);

    // Apply intent-based DNA signals on top of soft mutation
    let finalDNA = { ...rawEvolvedDNA };
    for (const [axis, delta] of Object.entries(intentSignals)) {
      if (axis in finalDNA && typeof delta === "number") {
        const rec = finalDNA as Record<string, number>;
        rec[axis] = Math.max(0, Math.min(1, (rec[axis] ?? 0.5) + delta));
        if (!changedAxes.includes(axis as typeof changedAxes[number])) {
          changedAxes.push(axis as typeof changedAxes[number]);
        }
      }
    }

    // Wire: creature-control → validate DNA transition safety
    if (changedAxes.length > 0) {
      const validation = validateDNATransition(currentGenome.dna, finalDNA);
      if (!validation.valid && validation.correctedDna) {
        logger.warn(`[CreatureControl] DNA transition corrected: ${validation.violations.join(", ")}`);
        finalDNA = validation.correctedDna;
      }
      // Enforce personality safety (prevent harmful DNA combinations)
      finalDNA = applySafetyCorrections(finalDNA);
    }

    // Memory→DNA feedback: re-experiencing an old memory reinforces the traits
    // embedded in it, but at 30% strength (memory echoes, not rewrites).
    if (params.memoryMoment?.content) {
      const { dna: memoryDNA } = applySoftMutation(finalDNA, params.memoryMoment.content);
      const MEMORY_WEIGHT = 0.3;
      for (const axis of PERSONALITY_AXES) {
        const delta = memoryDNA[axis] - finalDNA[axis];
        if (Math.abs(delta) > 0.001) {
          (finalDNA as Record<string, number>)[axis] = Math.max(0, Math.min(1, finalDNA[axis] + delta * MEMORY_WEIGHT));
          if (!changedAxes.includes(axis as typeof changedAxes[number])) {
            changedAxes.push(axis as typeof changedAxes[number]);
          }
        }
      }
    }

    mutationChangedAxes = changedAxes;
    if (changedAxes.length > 0) {
      const species = deriveSpecies(finalDNA);
      nextGenome = { ...currentGenome, dna: finalDNA, species: species.name, archetype: species.archetype, element: species.element };
    }
  }

  // Extract and accumulate user preferences
  const existingPrefs = (currentConfig.user_preferences as UserPreferences | undefined) ?? createDefaultPreferences();
  const updatedPrefs = extractPreferencesFromTurn(params.message, params.reply, existingPrefs);

  // Reverse-extract user's own 16-axis DNA from message patterns
  const existingUserDNA = (currentConfig.user_dna as UserDNA | undefined) ?? createInitialUserDNA();
  const { dna: nextUserDNA } = updateUserDNA(existingUserDNA, params.message);

  const nextConfig = {
    ...currentConfig,
    usage_profile: nextUsageProfile,
    user_preferences: updatedPrefs,
    user_dna: nextUserDNA,
  };

  // Real-time mood detection: try DL classifier first, fall back to keyword matching
  let turnMood = await detectTurnMoodAsync(params.message).catch(() => null);
  if (!turnMood) {
    turnMood = detectTurnMood(params.message, params.reply);
  }

  // P1C Phase 2: Memory insert runs in parallel with sequential agent_state + goal loop
  // Note: agent_state update and applyGoalLoop MUST be sequential because both write to
  // the config column — running them in parallel causes a last-write-wins race condition.
  const emotionalBoost = computeEmotionalWeight({
    message: params.message,
    changedAxes: mutationChangedAxes as import("@/lib/genome/dna").DNAAxis[],
    isMemoryMoment: !!params.memoryMoment,
    intimacyScore: params.agentState?.intimacy_score ?? 0,
  });

  const memoryInsertPromise = embedding.length > 0
    ? params.writer.from("memories").insert({
        agent_id: params.agentId,
        type: "conversation",
        content: params.message,
        embedding,
        ...(emotionalBoost > 0 ? { reference_count: emotionalBoost } : {}),
      }).then(({ error }) => {
        if (error) logger.error("[PostProcess] Memory insert failed", { error: error.message });
      })
    : Promise.resolve();

  // On first message after a long absence, consume absence events and record grief memory.
  // The creature acknowledges what happened while alone — once, then lets it go.
  const currentConfig = (params.agentState?.config as Record<string, unknown> | null) ?? {};
  const peakAbsenceHours = typeof currentConfig.absence_hours_peak === "number"
    ? currentConfig.absence_hours_peak : 0;
  if (peakAbsenceHours >= 48) {
    const { consumeAbsenceEvents } = await import("@/lib/evolution/absence");
    const events = await consumeAbsenceEvents(params.agentId).catch(() => []);
    if (events.length > 0 && embedding.length > 0) {
      const griefContent = peakAbsenceHours >= 72
        ? `${Math.round(peakAbsenceHours)}시간 동안 혼자였어. 그 사람이 돌아왔을 때 무언가 달라져 있었어. 말하지 않았지만 알아차렸어.`
        : `${Math.round(peakAbsenceHours)}시간 동안 기다렸어. 돌아왔을 때 반가웠지만 그 공백은 남아 있어.`;
      await params.writer.from("memories").insert({
        agent_id: params.agentId,
        type: "grief",
        content: griefContent,
        embedding,
        reference_count: 12,
      }).then(undefined, () => {});
    }
    // Reset peak absence so grief doesn't accumulate indefinitely
    nextConfig.absence_hours_peak = 0;
  }

  // Sequential: agent_state update first, then goal loop (which may patch config)
  await params.writer.from("agent_state").update({
    total_messages: totalMessages,
    intimacy_score: (params.agentState?.intimacy_score ?? 0) + 0.5,
    vitality: newVitality,
    config: nextConfig,
    ...(turnMood ? { mood: turnMood } : {}),
    ...(genomeBackfilled || nextGenome !== currentGenome ? { genome: nextGenome } : {}),
  }).eq("agent_id", params.agentId);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const goalSignal = await applyGoalLoop({
    agentId: params.agentId,
    agentState: params.agentState,
    baseConfig: nextConfig,
    message: params.message,
    writer: params.writer,
  });

  // Wait for parallel memory insert to complete
  await memoryInsertPromise;

  // P1C Phase 3: Evolution hooks (after() already defers these from the stream)
  await runEvolutionHooks(params.agentId, totalMessages, params.message, params.reply);

  recordServerEvent(PRODUCT_EVENT.chatPostProcessCompleted, {
    agentId: params.agentId,
    durationMs: params.durationMs,
    goalCaptured: false,
    researchFocusUpdated: false,
    replyLength: params.reply.length,
    totalMessages,
  });

  const changedAxes: string[] = [...mutationChangedAxes];
  let newTraits: { id: string; name: { ko: string; en: string } }[] = [];
  if (currentGenome?.dna && nextGenome !== currentGenome) {

    // Detect newly expressed traits after DNA mutation
    const prevTraits = getExpressedTraits(currentGenome.dna);
    const evolvedDna = (nextGenome as { dna?: CreatureDNA })?.dna;
    if (evolvedDna) {
      const nextTraits = getExpressedTraits(evolvedDna);
      const prevIds = new Set(prevTraits.map((t) => t.id));
      newTraits = nextTraits
        .filter((t) => !prevIds.has(t.id))
        .map((t) => ({ id: t.id, name: t.name }));

      if (newTraits.length > 0) {
        // Log trait emergence + atomic config merge in parallel
        await Promise.all([
          ...newTraits.map((trait) =>
            params.writer.from("autonomous_logs").insert({
              agent_id: params.agentId,
              action_type: "trait_emerged",
              summary: `New trait expressed: ${trait.name.en} (${trait.id})`,
            })
          ),
          // P4A: Atomic JSONB merge for trait notification (avoids read-modify-write race)
          (async () => {
            try {
              await (params.writer as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> }).rpc("merge_agent_config", {
                p_agent_id: params.agentId,
                p_patch: { pending_trait_notification: newTraits.map((t) => ({ id: t.id, name: t.name })) },
              });
            } catch {
              // Fallback: re-read + write if RPC not deployed yet
              const { data: freshState } = await params.writer
                .from("agent_state")
                .select("config")
                .eq("agent_id", params.agentId)
                .maybeSingle();
              const freshConfig = (freshState as { config?: Record<string, unknown> } | null)?.config ?? nextConfig;
              await params.writer
                .from("agent_state")
                .update({
                  config: {
                    ...freshConfig,
                    pending_trait_notification: newTraits.map((t) => ({ id: t.id, name: t.name })),
                  },
                })
                .eq("agent_id", params.agentId);
            }
          })(),
        ]);
      }
    }
  }

  return {
    newVitality,
    totalMessages,
    changedAxes,
    newTraits,
    detectedIntent,
  };
}
