import { createServiceClient } from "@/lib/supabase/service";

/**
 * F15: 1% chance when total_messages > 100 to ask "Did anything I said ever hurt you?"
 */
export async function maybeRequestFeedback(agentId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("total_messages, config").eq("agent_id", agentId).single();
  const total = (stateRow as { total_messages?: number })?.total_messages ?? 0;
  if (total < 100 || Math.random() >= 0.01) return false;

  const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
  const question = "Did anything I said ever hurt you? You can tell me.";
  await service.from("agent_state").update({
    config: { ...config, pending_question: question },
  }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "feedback_request",
    summary: "Asked user for feedback.",
  });
  return true;
}
