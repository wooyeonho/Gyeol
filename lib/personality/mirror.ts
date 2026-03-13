import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

export async function analyzeMirrorEffect(agentId: string) {
  const db = createServiceClient();
  const { data: chats } = await db.from("chats").select("role, content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(20);
  if (!chats || chats.length < 10) return;

  const convo = chats.reverse().map((c) => `${c.role}: ${c.content}`).join("\n");
  const { data: state } = await db.from("agent_state").select("fragments, config").eq("agent_id", agentId).single();
  const locale = resolveGenerationLocale({ config: state?.config });
  const language = getLanguageName(locale);
  const result = await generateJSON(
    "Analyze speech patterns. Respond ONLY valid JSON.",
    `Conversation:\n${convo}\n\nIs the AI mirroring the user's speech patterns?\nJSON: {"mirroring":true|false,"observation":"${language} observation"}`
  );
  if (!result?.mirroring) return;
  if (!state) return;

  const fragments = [...(state.fragments || []), result.observation].slice(-20);
  await db.from("agent_state").update({ fragments }).eq("agent_id", agentId);
  await db.from("memories").insert({ agent_id: agentId, type: "observation", content: result.observation });
}
