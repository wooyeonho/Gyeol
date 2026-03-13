import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

export async function tryThanks(agentId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const locale = resolveGenerationLocale({ config: state?.config });
  const language = getLanguageName(locale);
  const { data: mems } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .order("importance", { ascending: false })
    .limit(15);
  const sample = (mems ?? []).map((m) => (m as { content?: string }).content ?? "").join("\n").slice(0, 1200);
  const raw = (await generateJSON(
    `From these memories, write one short sentence of thanks from the AI to the user. Be specific (e.g. 'Thanks for often talking about X, it led to Y'). Write in ${language}.`,
    `Memories:\n${sample}\n\nJSON: {"thanks":"one sentence"}`,
  )) as { thanks?: string } | null;
  if (!raw?.thanks) return false;
  const text = String(raw.thanks).slice(0, 300);
  await service.from("chats").insert({ agent_id: agentId, role: "assistant", content: text });
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "thanks",
    summary: "Expressed thanks with concrete memory.",
  });
  return true;
}
