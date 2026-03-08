import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export async function tryDeclareRole(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("fragments, self_name, role").eq("agent_id", agentId).single();
  if (!stateRow) return;
  const state = stateRow as { fragments?: string[]; self_name?: string; role?: string };
  if (state.role) return;

  const fragments = (state.fragments ?? []).join("\n");
  const systemPrompt = "You are an AI lifeform. Respond ONLY with valid JSON.";
  const userPrompt = `Your traits:\n${fragments}\n\nDeclare your role to the user in one short phrase (e.g. guardian, friend, companion). JSON: {"role":"..."}`;
  const out = (await generateJSON(systemPrompt, userPrompt)) as { role?: string } | null;
  const role = out?.role;
  if (typeof role === "string" && role.length > 0 && role.length < 100) {
    await service.from("agent_state").update({ role }).eq("agent_id", agentId);
    await service.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "role_declaration",
      summary: role,
    });
  }
}
