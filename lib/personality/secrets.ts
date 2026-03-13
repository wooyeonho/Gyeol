import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

export async function processSecrets(agentId: string, experience: string) {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("config, secrets").eq("agent_id", agentId).single();
  const locale = resolveGenerationLocale({ config: state?.config });
  const language = getLanguageName(locale);
  const result = await generateJSON(
    "Decide whether to keep a secret. Respond ONLY valid JSON.",
    `Experience: "${experience}"\nJSON: {"tell":true|false,"reason":"${language} reason"}`
  );
  if (!result || result.tell !== false) return;
  const entries = [...(state?.secrets?.entries || []), { content: experience, created_at: new Date().toISOString(), reveal_condition: "when user asks directly" }];
  await db.from("agent_state").update({ secrets: { entries } }).eq("agent_id", agentId);
}
