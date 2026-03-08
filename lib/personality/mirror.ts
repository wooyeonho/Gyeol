import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";

export async function analyzeMirrorEffect(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: chats } = await service
    .from("chats")
    .select("role, content")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(20);
  const messages = (chats ?? []) as { role: string; content: string }[];
  if (messages.length < 10) return;

  const block = messages.map((m) => `${m.role}: ${(m.content ?? "").slice(0, 200)}`).join("\n");
  const result = (await generateJSON(
    "Is the AI mirroring the user's speech style? Respond ONLY valid JSON.",
    `Conversations:\n${block}\n\nJSON: {"mirroring": true or false, "observation": "one short sentence in Korean"}`
  )) as { mirroring?: boolean; observation?: string } | null;

  if (!result?.mirroring || !result.observation?.trim()) return;

  const { data: stateRow } = await service.from("agent_state").select("fragments").eq("agent_id", agentId).single();
  const fragments = Array.isArray((stateRow as { fragments?: string[] })?.fragments) ? [...((stateRow as { fragments?: string[] }).fragments ?? [])] : [];
  if (!fragments.includes(result.observation)) {
    fragments.push(result.observation);
  }

  const emb = await generateEmbedding(result.observation);
  if (emb.length > 0) {
    await service.from("memories").insert({
      agent_id: agentId,
      type: "observation",
      content: result.observation,
      embedding: emb,
    });
  }
  await service.from("agent_state").update({ fragments }).eq("agent_id", agentId);
}
