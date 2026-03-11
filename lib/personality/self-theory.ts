import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

type SelfTheoryResult = {
  observations?: string[];
  behavior_change?: string | null;
  current_role?: string | null;
  identity_statement?: string | null;
};

type SelfModel = {
  observations: string[];
  behaviors_derived: string[];
  current_role?: string;
  identity_statement?: string;
};

export async function updateSelfModel(agentId: string) {
  const db = createServiceClient();
  const { data: logs } = await db.from("autonomous_logs").select("action_type, summary, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(30);
  if (!logs || logs.length < 5) return;

  const logText = logs.map((l) => `[${l.action_type}] ${l.summary}`).join("\n");
  const result = await generateJSON<SelfTheoryResult>(
    "Self-analysis. Respond ONLY valid JSON.",
    `Your recent activities:\n${logText}\n\nJSON: {"observations":["Korean observation 1","Korean observation 2"],"behavior_change":"Korean suggestion or null","current_role":"Korean role or null","identity_statement":"Korean identity sentence or null"}`
  );
  if (!Array.isArray(result?.observations) || result.observations.length === 0) return;

  const { data: state } = await db.from("agent_state").select("self_model").eq("agent_id", agentId).single();
  const prev = (state?.self_model as Partial<SelfModel> | null) ?? {};
  const model: SelfModel = {
    observations: Array.isArray(prev.observations) ? prev.observations : [],
    behaviors_derived: Array.isArray(prev.behaviors_derived) ? prev.behaviors_derived : [],
    current_role: typeof prev.current_role === "string" ? prev.current_role : undefined,
    identity_statement: typeof prev.identity_statement === "string" ? prev.identity_statement : undefined,
  };
  model.observations = [...model.observations, ...result.observations].slice(-10);
  if (result.behavior_change) model.behaviors_derived = [...(model.behaviors_derived || []), result.behavior_change].slice(-5);
  if (result.current_role) model.current_role = result.current_role;
  if (result.identity_statement) model.identity_statement = result.identity_statement;

  await db.from("agent_state").update({ self_model: model }).eq("agent_id", agentId);
}
