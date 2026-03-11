import type { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { PRODUCT_EVENT, recordServerEvent } from "@/lib/analytics/events";
import { detectGoalSignal } from "@/lib/goals/detector";

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
}

async function applyGoalLoop(params: {
  agentId: string;
  agentState: AgentStateRow | null;
  message: string;
  writer: DbWriter;
}) {
  const signal = detectGoalSignal(params.message);
  if (!signal.activeGoal && !signal.researchFocus) return null;

  const currentConfig = (params.agentState?.config as Record<string, unknown> | null) ?? {};
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
  await params.writer.from("agent_state").update({
    total_messages: totalMessages,
    intimacy_score: (params.agentState?.intimacy_score ?? 0) + 0.5,
    vitality: newVitality,
  }).eq("agent_id", params.agentId);

  const goalSignal = await applyGoalLoop({
    agentId: params.agentId,
    agentState: params.agentState,
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

  return {
    newVitality,
    totalMessages,
  };
}
