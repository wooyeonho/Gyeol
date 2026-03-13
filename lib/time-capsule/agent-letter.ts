import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

/**
 * G3: Gyeol writes a letter to the user's future self (user_model style). Delivered 1 year later.
 */
export async function tryCreateAgentLetter(agentId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: stateRow } = await service
    .from("agent_state")
    .select("user_model, self_name, config")
    .eq("agent_id", agentId)
    .single();
  const userModel = (stateRow as { user_model?: { speech_patterns?: string[]; values?: string[] } })?.user_model;
  const selfName = (stateRow as { self_name?: string })?.self_name ?? "Your Gyeol";
  const hasModel = userModel && (
    (userModel.speech_patterns?.length ?? 0) + (userModel.values?.length ?? 0) >= 3
  );
  if (!hasModel) return false;
  const locale = resolveGenerationLocale({ config: (stateRow as { config?: unknown } | null)?.config });
  const language = getLanguageName(locale);

  const systemPrompt = `You are writing a short letter to the user's future self (one year from now). Write as the user would write: same tone, phrases, values. 2-4 sentences. Write in ${language}.`;
  const userPrompt = "Write a supportive letter the user will read in one year. Use their style. No greeting needed.";
  const message = await generateTextOnce(systemPrompt, userPrompt, { max_tokens: 200, temperature: 0.7 });
  if (!message?.trim()) return false;

  const deliverAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await service.from("time_capsules").insert({
    agent_id: agentId,
    message: `[From ${selfName}] ${message.trim()}`,
    deliver_at: deliverAt,
    delivered: false,
  });
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "agent_letter",
    summary: "Letter to future self created.",
  });
  return true;
}
