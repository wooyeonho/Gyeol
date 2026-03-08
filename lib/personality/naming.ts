import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export async function checkSelfNaming(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("self_name, total_messages").eq("agent_id", agentId).single();
  if (!stateRow) return;

  const selfName = (stateRow as { self_name?: string | null }).self_name;
  const totalMessages = Number((stateRow as { total_messages?: number }).total_messages) ?? 0;

  const { count } = await service.from("memories").select("id", { count: "exact", head: true }).eq("agent_id", agentId);
  const memoryCount = count ?? 0;

  if (selfName != null && selfName !== "" && memoryCount < 100) return;

  if (selfName == null || selfName === "") {
    if (totalMessages < 20 || memoryCount < 30) return;
    const result = (await generateJSON(
      "Give this AI lifeform a one-word name in Korean. Respond ONLY valid JSON.",
      "Choose one short Korean word as its name. JSON: {\"name\": \"...\", \"reason\": \"...\"}"
    )) as { name?: string; reason?: string } | null;
    if (result?.name) {
      await service.from("agent_state").update({ self_name: result.name }).eq("agent_id", agentId);
      await service.from("autonomous_logs").insert({
        agent_id: agentId,
        action_type: "self_naming",
        summary: result.name + (result.reason ? ` (${result.reason})` : ""),
      });
    }
    return;
  }

  if (memoryCount >= 100) {
    const result = (await generateJSON(
      "Does the name still fit? Respond ONLY valid JSON.",
      `Current name: ${selfName}. Memories: ${memoryCount}. JSON: {"keep": true or false, "new_name": "" or new name}`
    )) as { keep?: boolean; new_name?: string } | null;
    if (result && result.keep === false && result.new_name) {
      await service.from("agent_state").update({ self_name: result.new_name }).eq("agent_id", agentId);
    }
  }
}
