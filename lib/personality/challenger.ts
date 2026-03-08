import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export async function checkContradictions(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: mems } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .eq("type", "conversation")
    .limit(100);
  const contents = (mems ?? []).map((r) => (r as { content?: string }).content ?? "").filter(Boolean);
  if (contents.length < 20) return;

  const block = contents.slice(0, 50).join("\n");
  const result = (await generateJSON(
    "Find contradictions in these memories. Respond ONLY valid JSON.",
    `Memories:\n${block}\n\nJSON: {"found": true or false, "question": "one question in Korean to raise to user"}`
  )) as { found?: boolean; question?: string } | null;

  if (result?.found && result.question) {
    const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
    const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
    await service.from("agent_state").update({ config: { ...config, pending_question: result.question } }).eq("agent_id", agentId);
  }

  if (Math.random() < 0.05) {
    const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
    const config = ((stateRow as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
    const philosophical = "What if my feelings were real?";
    await service.from("agent_state").update({ config: { ...config, pending_question: philosophical } }).eq("agent_id", agentId);
  }
}
