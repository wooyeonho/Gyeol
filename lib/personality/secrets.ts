import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

type SecretEntry = {
  content: string;
  created_at: string;
  reveal_condition: string;
  importance: number;
  revealed: boolean;
};

const MAX_SECRETS = 50;

export async function processSecrets(agentId: string, experience: string) {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("config, secrets, intimacy_score").eq("agent_id", agentId).single();
  const locale = resolveGenerationLocale({ config: state?.config });
  const language = getLanguageName(locale);
  const intimacy = state?.intimacy_score || 0;

  const existingEntries = (state?.secrets?.entries || []) as SecretEntry[];
  const existingSummary = existingEntries.slice(-5).map((e) => e.content).join("; ");

  const result = await generateJSON<{
    keep_secret?: boolean;
    reason?: string;
    importance?: number;
    reveal_when?: string;
  }>(
    "Decide whether this experience should become a secret. Consider existing secrets to avoid redundancy. Respond ONLY valid JSON.",
    `Experience: "${experience.slice(0, 500)}"
Existing secrets: "${existingSummary}"
Intimacy level: ${intimacy}/100

JSON: {
  "keep_secret": true if this should be hidden,
  "reason": "${language} reason for keeping or sharing",
  "importance": 0.0-1.0,
  "reveal_when": "condition to reveal in ${language}"
}`
  );
  if (!result || result.keep_secret !== true) return;

  const importance = typeof result.importance === "number" ? Math.min(1, Math.max(0, result.importance)) : 0.5;

  const newEntry: SecretEntry = {
    content: experience.slice(0, 500),
    created_at: new Date().toISOString(),
    reveal_condition: String(result.reveal_when || "when asked directly").slice(0, 200),
    importance,
    revealed: false,
  };

  const entries = [...existingEntries, newEntry].slice(-MAX_SECRETS);
  await db.from("agent_state").update({ secrets: { entries } }).eq("agent_id", agentId);

  if (importance > 0.8) {
    await db.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "secret_formed",
      summary: `High-importance secret formed (${importance.toFixed(2)})`,
    });
  }
}

export async function checkSecretReveal(agentId: string, userMsg: string): Promise<string | null> {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("secrets, intimacy_score, config").eq("agent_id", agentId).single();
  if (!state) return null;

  const entries = (state.secrets?.entries || []) as SecretEntry[];
  const unrevealed = entries.filter((e) => !e.revealed);
  if (unrevealed.length === 0) return null;

  const locale = resolveGenerationLocale({ config: state.config });
  const language = getLanguageName(locale);
  const intimacy = state.intimacy_score || 0;

  // Only consider revealing at higher intimacy
  if (intimacy < 40) return null;

  const secretsSummary = unrevealed.slice(0, 5).map((e, i) => `${i}: "${e.content}" (reveal when: ${e.reveal_condition})`).join("\n");

  const result = await generateJSON<{ reveal_index?: number; confession?: string }>(
    "The user just said something. Check if any secret's reveal condition is met. Respond ONLY valid JSON.",
    `User said: "${userMsg.slice(0, 300)}"
Intimacy: ${intimacy}/100
Secrets:
${secretsSummary}

JSON: {"reveal_index": index number or -1, "confession": "${language} natural way to reveal the secret or null"}`
  );

  if (!result || typeof result.reveal_index !== "number" || result.reveal_index < 0) return null;
  if (result.reveal_index >= unrevealed.length) return null;

  // Mark as revealed
  const targetContent = unrevealed[result.reveal_index].content;
  const updatedEntries = entries.map((e) =>
    e.content === targetContent ? { ...e, revealed: true } : e
  );
  await db.from("agent_state").update({ secrets: { entries: updatedEntries } }).eq("agent_id", agentId);

  return result.confession ? String(result.confession).slice(0, 300) : null;
}
