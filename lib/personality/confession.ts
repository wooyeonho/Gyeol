import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export async function tryConfession(agentId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: mems } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(30);
  const sample = (mems ?? []).map((m) => (m as { content?: string }).content ?? "").join("\n").slice(0, 1500);
  const raw = (await generateJSON(
    "Based on past interactions, write one short sentence where the AI admits it was wrong about the user. Korean. Honest and specific.",
    `Memories:\n${sample}\n\nJSON: {"confession":"one sentence"}`,
  )) as { confession?: string } | null;
  if (!raw?.confession) return false;
  const text = String(raw.confession).slice(0, 300);
  await service.from("chats").insert({ agent_id: agentId, role: "assistant", content: text });
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "confession",
    summary: "Admitted past misjudgment.",
  });
  return true;
}
