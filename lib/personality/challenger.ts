import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

export async function checkContradictions(agentId: string) {
  const db = createServiceClient();
  const { data: memories } = await db.from("memories").select("content").eq("agent_id", agentId).eq("type", "conversation").order("created_at", { ascending: false }).limit(50);
  if (!memories || memories.length < 10) return;

  const content = memories.map((m) => m.content).join("\n");
  const result = await generateJSON(
    "Find contradictions. Respond ONLY valid JSON.",
    `User's past statements:\n${content}\n\nJSON: {"found":true|false,"question":"Korean contradiction question or null"}`
  );
  if (!result?.found || !result.question) return;

  const { data: state } = await db.from("agent_state").select("config").eq("agent_id", agentId).single();
  if (state) {
    await db.from("agent_state").update({ config: { ...state.config, pending_question: result.question } }).eq("agent_id", agentId);
  }
}
