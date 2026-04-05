import type { createServiceClient } from "@/lib/supabase/service";
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
import { detectTurnMood } from "@/lib/evolution/personality";
// P1F: Static imports — avoid dynamic import() cold-start penalty in serverless
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

// P1F: Static imports — conditional execution only
async function runEvolutionHooks(agentId: string, totalMessages: number, message: string, reply: string) {
  if (totalMessages % 10 === 0) {
    try {
      await analyzePersonality(agentId);
    } catch (error) {
      console.error("[Evolution]", error);
    }
  }

  // Run remaining hooks in parallel — they are independent
  await Promise.allSettled([
    checkEvolution(agentId).catch((e) => console.error("[GenLevel]", e)),
    processHiddenEmotions(agentId, message, reply).catch((e) => console.error("[Emotions]", e)),
    updateVoiceParams(agentId).catch((e) => console.error("[Voice]", e)),
  ]);
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
  reply: string;
  writer: DbWriter;
}) {
  // ── P1C Phase 1: Independent operations in parallel ──
  const [, embedding] = await Promise.all([
    params.writer.from("chats").insert([
      { agent_id: params.agentId, role: "user", content: params.message },
      { agent_id: params.agentId, role: "assistant", content: params.reply },
    ]),
    generateEmbedding(params.message),
  ]);

  const totalMessages = (params.agentState?.total_messages ?? 0) + 1;
  const newVitality = Math.min(1, (params.agentState?.vitality ?? 1) + 0.02);
  const currentConfig = (params.agentState?.config as Record<string, unknown> | null) ?? {};
  const previousUsageProfile = currentConfig.usage_profile;
  const nextUsageProfile = updateUsageProfile(previousUsageProfile, params.message, params.reply);

  // Evolve creature DNA based on conversation signals
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

  // Extract and accumulate user preferences
  const existingPrefs = (currentConfig.user_preferences as UserPreferences | undefined) ?? createDefaultPreferences();
  const updatedPrefs = extractPreferencesFromTurn(params.message, params.reply, existingPrefs);
  const turnMood = detectTurnMood(params.message, params.reply);

  // Reverse-extract user's own 16-axis DNA from message patterns
  const existingUserDNA = (currentConfig.user_dna as UserDNA | undefined) ?? createInitialUserDNA();
  const { dna: nextUserDNA } = updateUserDNA(existingUserDNA, params.message);

  const nextConfig = {
    ...currentConfig,
    usage_profile: nextUsageProfile,
    user_preferences: updatedPrefs,
    user_dna: nextUserDNA,
  };

  // ── P1C Phase 2: Parallel DB writes (memory insert + state update + goal loop) ──
  await Promise.all([
    embedding.length > 0
      ? params.writer.from("memories").insert({
          agent_id: params.agentId,
          type: "conversation",
          content: params.message,
          embedding,
        })
      : Promise.resolve(),
    params.writer.from("agent_state").update({
      total_messages: totalMessages,
      intimacy_score: (params.agentState?.intimacy_score ?? 0) + 0.5,
      vitality: newVitality,
      config: nextConfig,
      ...(turnMood ? { mood: turnMood } : {}),
      ...(genomeBackfilled || nextGenome !== currentGenome ? { genome: nextGenome } : {}),
    }).eq("agent_id", params.agentId),
    applyGoalLoop({
      agentId: params.agentId,
      agentState: params.agentState,
      baseConfig: nextConfig,
      message: params.message,
      writer: params.writer,
    }),
  ]);

  // ── P1C Phase 3: Evolution hooks (may include AI calls) ──
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
    const prevTraits = getExpressedTraits(currentGenome.dna);
    const evolvedDna = (nextGenome as { dna?: CreatureDNA })?.dna;
    if (evolvedDna) {
      const nextTraits = getExpressedTraits(evolvedDna);
      const prevIds = new Set(prevTraits.map((t) => t.id));
      newTraits = nextTraits
        .filter((t) => !prevIds.has(t.id))
        .map((t) => ({ id: t.id, name: t.name }));

      if (newTraits.length > 0) {
        for (const trait of newTraits) {
          await params.writer.from("autonomous_logs").insert({
            agent_id: params.agentId,
            action_type: "trait_emerged",
            summary: `New trait expressed: ${trait.name.en} (${trait.id})`,
          });
        }

        // P4A: Atomic config merge for trait notification
        try {
          const { error: rpcError } = await params.writer.rpc("merge_agent_config", {
            p_agent_id: params.agentId,
            p_patch: {
              pending_trait_notification: newTraits.map((t) => ({ id: t.id, name: t.name })),
            },
          });
          if (rpcError) {
            // Fallback: read-modify-write
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
        } catch {
          // Non-critical — trait notification can be lost without breaking core flow
        }
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
