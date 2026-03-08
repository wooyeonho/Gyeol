import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export async function updateSelfModel(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: logs } = await service
    .from("autonomous_logs")
    .select("action_type, summary, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(30);

  const logBlock = (logs ?? [])
    .map((l) => `${(l as { action_type?: string }).action_type}: ${(l as { summary?: string }).summary ?? ""}`)
    .join("\n");
  if (!logBlock.trim()) return;

  const result = (await generateJSON(
    "Analyze activity and self-observe. Respond ONLY valid JSON.",
    `Activity log:\n${logBlock}\n\nJSON: {"observations": ["short Korean sentence 1", "..."], "behavior_change": "one sentence or null"}`
  )) as { observations?: string[]; behavior_change?: string | null } | null;

  if (!result?.observations?.length) return;

  const { data: stateRow } = await service.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const selfModel = ((stateRow as { self_model?: { observations?: string[]; behaviors_derived?: string[] } })?.self_model ?? {}) as {
    observations?: string[];
    behaviors_derived?: string[];
  };
  const observations = Array.isArray(selfModel.observations) ? [...selfModel.observations] : [];
  const behaviorsDerived = Array.isArray(selfModel.behaviors_derived) ? [...selfModel.behaviors_derived] : [];

  for (const obs of result.observations) {
    if (obs && !observations.includes(obs) && observations.length < 10) {
      observations.push(obs);
    }
  }
  if (observations.length > 10) observations.splice(0, observations.length - 10);

  if (result.behavior_change) {
    behaviorsDerived.push(result.behavior_change);
  }

  const { data: fullRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const config = ((fullRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
  if (result.behavior_change?.toLowerCase().includes("night")) {
    config.life_interval = 2;
  }

  await service
    .from("agent_state")
    .update({
      self_model: { ...selfModel, observations, behaviors_derived: behaviorsDerived },
      config: Object.keys(config).length ? config : undefined,
    })
    .eq("agent_id", agentId);
}
