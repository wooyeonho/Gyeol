import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

type SelfTheoryResult = {
  observations?: string[];
  behavior_change?: string | null;
};

type SelfModel = {
  observations: string[];
  behaviors_derived: string[];
};

export async function updateSelfModel(agentId: string) {
  const db = createServiceClient();
  const { data: logs } = await db.from("autonomous_logs").select("action_type, summary, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(30);
  if (!logs || logs.length < 5) return;

  const logText = logs.map((l) => `[${l.action_type}] ${l.summary}`).join("\n");
  const result = await generateJSON<SelfTheoryResult>(
    "Self-analysis. Respond ONLY valid JSON.",
    `Your recent activities:\n${logText}\n\nJSON: {"observations":["Korean observation 1","Korean observation 2"],"behavior_change":"Korean suggestion or null"}`
  );
  if (!Array.isArray(result?.observations) || result.observations.length === 0) return;

  const { data: state } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const prev = (state?.self_model as Partial<SelfModel> | null) ?? {};
  const model: SelfModel = {
    observations: Array.isArray(prev.observations) ? prev.observations : [],
    behaviors_derived: Array.isArray(prev.behaviors_derived) ? prev.behaviors_derived : [],
  };
  model.observations = [...model.observations, ...result.observations].slice(-10);
  if (result.behavior_change) model.behaviors_derived = [...(model.behaviors_derived || []), result.behavior_change].slice(-5);

  await db.from("agent_state").update({ self_model: model }).eq("agent_id", agentId);
}
