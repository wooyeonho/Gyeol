import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

export async function analyzeMirrorEffect(agentId: string) {
  const db = createServiceClient();
  const { data: chats } = await db.from("chats").select("role, content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(20);
  if (!chats || chats.length < 10) return;

  const convo = chats.reverse().map((c) => `${c.role}: ${c.content}`).join("\n");
  const result = await generateJSON(
    "Analyze speech patterns. Respond ONLY valid JSON.",
    `Conversation:\n${convo}\n\nIs the AI mirroring the user's speech patterns?\nJSON: {"mirroring":true|false,"observation":"Korean observation"}`
  );
  if (!result?.mirroring) return;

  const { data: state } = await db.from("agent_state").select("fragments").eq("agent_id", agentId).single();
  if (!state) return;

  const fragments = [...(state.fragments || []), result.observation].slice(-20);
  await db.from("agent_state").update({ fragments }).eq("agent_id", agentId);
  await db.from("memories").insert({ agent_id: agentId, type: "observation", content: result.observation });
}
