import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

export async function checkSelfNaming(agentId: string) {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("self_name, total_messages").eq("agent_id", agentId).single();
  if (!state || state.self_name || (state.total_messages || 0) < 20) return;

  const { data: memories } = await db.from("memories").select("content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(20);
  const context = (memories || []).map((m) => m.content).join("\n");

  const result = await generateJSON(
    "Name yourself. Respond ONLY valid JSON.",
    `Your memories:\n${context}\n\nGive yourself a name. One Korean word.\nJSON: {"name":"name","reason":"Korean reason"}`
  );
  if (!result?.name) return;

  await db.from("agent_state").update({ self_name: result.name }).eq("agent_id", agentId);
  await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "self_naming", summary: `Named self: ${result.name}. Reason: ${result.reason}` });
}
