import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

const MIN_MEMORIES = 300;

export type UserModel = {
  speech_patterns: string[];
  values: string[];
  decision_patterns: string[];
};

export async function updateUserModel(agentId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: stateConfigRow } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const locale = resolveGenerationLocale({ config: stateConfigRow?.config });
  const language = getLanguageName(locale);
  const { count } = await service
    .from("memories")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId);
  if ((count ?? 0) < MIN_MEMORIES) return false;

  const { data: convos } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .eq("type", "conversation")
    .order("created_at", { ascending: false })
    .limit(200);
  const texts = (convos ?? []).map((r) => (r as { content?: string }).content ?? "").filter(Boolean);
  if (texts.length < 50) return false;

  const sample = texts.slice(0, 80).join("\n");
  const system = "Analyze the user's speech and values from conversations. Respond ONLY valid JSON.";
  const user = `Conversations (user messages or context):\n${sample}\n\nJSON: {"speech_patterns":["phrase or style 1","..."],"values":["value or priority 1","..."],"decision_patterns":["pattern 1","..."]}. Use short ${language} labels.`;

  const raw = await generateJSON(system, user) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return false;

  const speech_patterns = Array.isArray(raw.speech_patterns) ? raw.speech_patterns.slice(0, 15) : [];
  const values = Array.isArray(raw.values) ? raw.values.slice(0, 10) : [];
  const decision_patterns = Array.isArray(raw.decision_patterns) ? raw.decision_patterns.slice(0, 10) : [];

  const { data: state } = await service.from("agent_state").select("user_model").eq("agent_id", agentId).single();
  const prev = (state?.user_model as UserModel | null) ?? { speech_patterns: [], values: [], decision_patterns: [] };
  const merged: UserModel = {
    speech_patterns: [...new Set([...prev.speech_patterns, ...speech_patterns])].slice(0, 20),
    values: [...new Set([...prev.values, ...values])].slice(0, 15),
    decision_patterns: [...new Set([...prev.decision_patterns, ...decision_patterns])].slice(0, 15),
  };

  await service.from("agent_state").update({ user_model: merged }).eq("agent_id", agentId);
  return true;
}
