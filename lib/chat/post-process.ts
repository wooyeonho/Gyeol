import type { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { PRODUCT_EVENT, recordServerEvent } from "@/lib/analytics/events";
import { detectGoalSignal } from "@/lib/goals/detector";
import { computeEffectivePriority } from "@/lib/goals/task-utils";
import { updateUsageProfile } from "@/lib/identity/usage-profile";
import { applySoftMutation, generateInitialDNA, type CreatureDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { getExpressedTraits } from "@/lib/genome/traits";
import { createDefaultPreferences, extractPreferencesFromTurn, type UserPreferences } from "@/lib/creature/preference-memory";

type DbWriter = Pick<ReturnType<typeof createServiceClient>, "from">;
type AgentStateRow = Record<string, unknown> & {
  intimacy_score?: number;
  total_messages?: number;
  vitality?: number;
};

async function runEvolutionHooks(agentId: string, totalMessages: number, message: string, reply: string) {
  if (totalMessages % 10 === 0) {
    try {
      const { analyzePersonality } = await import("@/lib/evolution/personality");
      await analyzePersonality(agentId);
    } catch (error) {
      console.error("[Evolution]", error);
    }
  }

  try {
    const { checkEvolution } = await import("@/lib/evolution/gen-level");
    await checkEvolution(agentId);
  } catch (error) {
    console.error("[GenLevel]", error);
  }

  try {
    const { processHiddenEmotions } = await import("@/lib/personality/deception");
    await processHiddenEmotions(agentId, message, reply);
  } catch (error) {
    console.error("[Emotions]", error);
  }

  try {
    const { updateVoiceParams } = await import("@/lib/personality/voice");
    await updateVoiceParams(agentId);
  } catch (error) {
    console.error("[Voice]", error);
  }
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

  await params.writer
    .from("agent_state")
    .update({ config: nextConfig })
    .eq("agent_id", params.agentId);

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
  reply: string;
  writer: DbWriter;
}) {
  await params.writer.from("chats").insert([
    { agent_id: params.agentId, role: "user", content: params.message },
    { agent_id: params.agentId, role: "assistant", content: params.reply },
  ]);

  const embedding = await generateEmbedding(params.message);
  if (embedding.length > 0) {
    await params.writer.from("memories").insert({
      agent_id: params.agentId,
      type: "conversation",
      content: params.message,
      embedding,
    });
  }

  const totalMessages = (params.agentState?.total_messages ?? 0) + 1;
  const newVitality = Math.min(1, (params.agentState?.vitality ?? 1) + 0.02);
  const currentConfig = (params.agentState?.config as Record<string, unknown> | null) ?? {};
  const previousUsageProfile = currentConfig.usage_profile;
  const nextUsageProfile = updateUsageProfile(previousUsageProfile, params.message, params.reply);

  // Evolve creature DNA based on conversation signals
  // Backfill: if genome was never initialized (pre-existing agent), generate it now
  const originalGenome = (params.agentState as Record<string, unknown>)?.genome as { dna?: CreatureDNA; species?: string; archetype?: string; element?: string } | null;
  let currentGenome = originalGenome;
  let genomeBackfilled = false;
  if (!currentGenome?.dna) {
    const initialDNA = generateInitialDNA(params.agentId);
    const initialSpecies = deriveSpecies(initialDNA);
    currentGenome = { dna: initialDNA, species: initialSpecies.name, archetype: initialSpecies.archetype, element: initialSpecies.element };
    genomeBackfilled = true;
    console.log(`[PostProcess] Backfilled genome for agent ${params.agentId}`);
  }
  let nextGenome = currentGenome;
  let mutationChangedAxes: string[] = [];
  if (currentGenome?.dna) {
    const { dna: evolvedDNA, changedAxes } = applySoftMutation(currentGenome.dna, params.message);
    mutationChangedAxes = changedAxes;
    if (changedAxes.length > 0) {
      const species = deriveSpecies(evolvedDNA);
      nextGenome = { ...currentGenome, dna: evolvedDNA, species: species.name, archetype: species.archetype, element: species.element };
    }
  }

  // Extract and accumulate user preferences (BG3-style: every conversation shapes the relationship)
  const existingPrefs = (currentConfig.user_preferences as UserPreferences | undefined) ?? createDefaultPreferences();
  const updatedPrefs = extractPreferencesFromTurn(params.message, params.reply, existingPrefs);

  const nextConfig = {
    ...currentConfig,
    usage_profile: nextUsageProfile,
    user_preferences: updatedPrefs,
  };

  await params.writer.from("agent_state").update({
    total_messages: totalMessages,
    intimacy_score: (params.agentState?.intimacy_score ?? 0) + 0.5,
    vitality: newVitality,
    config: nextConfig,
    ...(genomeBackfilled || nextGenome !== currentGenome ? { genome: nextGenome } : {}),
  }).eq("agent_id", params.agentId);

  const goalSignal = await applyGoalLoop({
    agentId: params.agentId,
    agentState: params.agentState,
    baseConfig: nextConfig,
    message: params.message,
    writer: params.writer,
  });

  await runEvolutionHooks(params.agentId, totalMessages, params.message, params.reply);

  recordServerEvent(PRODUCT_EVENT.chatPostProcessCompleted, {
    agentId: params.agentId,
    durationMs: params.durationMs,
    goalCaptured: Boolean(goalSignal?.activeGoal),
    researchFocusUpdated: Boolean(goalSignal?.researchFocus),
    replyLength: params.reply.length,
    totalMessages,
  });

  // Reuse changedAxes from the first applySoftMutation call (deterministic, no need to recompute)
  const changedAxes: string[] = [...mutationChangedAxes];
  let newTraits: { id: string; name: { ko: string; en: string } }[] = [];
  if (currentGenome?.dna && nextGenome !== currentGenome) {

    // TASK 3: Detect newly expressed traits after DNA mutation
    const prevTraits = getExpressedTraits(currentGenome.dna);
    const evolvedDna = (nextGenome as { dna?: CreatureDNA })?.dna;
    if (evolvedDna) {
      const nextTraits = getExpressedTraits(evolvedDna);
      const prevIds = new Set(prevTraits.map((t) => t.id));
      newTraits = nextTraits
        .filter((t) => !prevIds.has(t.id))
        .map((t) => ({ id: t.id, name: t.name }));

      if (newTraits.length > 0) {
        // Log trait emergence in autonomous_logs
        for (const trait of newTraits) {
          await params.writer.from("autonomous_logs").insert({
            agent_id: params.agentId,
            action_type: "trait_emerged",
            summary: `New trait expressed: ${trait.name.en} (${trait.id})`,
          });
        }

        // Re-read current config from DB to avoid overwriting goal data written by applyGoalLoop
        const { data: freshState } = await params.writer
          .from("agent_state")
          .select("config")
          .eq("agent_id", params.agentId)
          .maybeSingle();
        const freshConfig = (freshState as { config?: Record<string, unknown> } | null)?.config ?? nextConfig;
        const latestConfig = {
          ...freshConfig,
          pending_trait_notification: newTraits.map((t) => ({ id: t.id, name: t.name })),
        };
        await params.writer
          .from("agent_state")
          .update({ config: latestConfig })
          .eq("agent_id", params.agentId);
      }
    }
  }

  return {
    newVitality,
    totalMessages,
    changedAxes,
    newTraits,
  };
}
