import { generateCognitiveJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

export async function checkSelfNaming(agentId: string) {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("self_name, total_messages, config").eq("agent_id", agentId).single();
  if (!state) return;
  // Treat null, empty, or default "GYEOL"/"결" as unnamed so existing creatures get renamed
  const SENTINEL_NAMES = new Set(["GYEOL", "결", "gyeol"]);
  const isUnnamed = !state.self_name || SENTINEL_NAMES.has(state.self_name);
  if (!isUnnamed || (state.total_messages || 0) < 5) return;
  const locale = resolveGenerationLocale({ config: state.config });
  const language = getLanguageName(locale);

  const { data: memories } = await db.from("memories").select("content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(20);
  const context = (memories || []).map((m) => m.content).join("\n");

  const result = await generateCognitiveJSON(
    "Name yourself. Respond ONLY valid JSON.",
    `Your memories:\n${context}\n\nGive yourself a name. One ${language} word.\nJSON: {"name":"name","reason":"${language} reason"}`
  );
  if (!result?.name || typeof result.name !== "string" || SENTINEL_NAMES.has(result.name)) return;

  await db.from("agent_state").update({ self_name: result.name }).eq("agent_id", agentId);
  await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "self_naming", summary: `Named self: ${result.name}. Reason: ${result.reason}` });
}
