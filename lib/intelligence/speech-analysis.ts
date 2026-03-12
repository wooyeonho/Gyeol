import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

/**
 * G6: Detect speech pattern changes (formal/informal, length, emoji).
 * "You suddenly started using formal speech. Why?"
 */
export async function analyzeSpeechPatterns(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: state } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
  const locale = resolveGenerationLocale({ config: state?.config });
  const language = getLanguageName(locale);
  const { data: chats } = await service
    .from("chats")
    .select("role, content, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(60);
  const userChats = (chats ?? []).filter((c) => (c as { role: string }).role === "user") as { content?: string; created_at?: string }[];
  if (userChats.length < 20) return;

  const recent = userChats.slice(0, 15).map((c) => (c.content ?? "").slice(0, 200)).join("\n");
  const older = userChats.slice(15, 30).map((c) => (c.content ?? "").slice(0, 200)).join("\n");
  const raw = (await generateJSON(
    `Compare recent vs older user messages. Detect: formal/informal switch, sentence length change, emoji change. One short observation in ${language} or null.`,
    `Recent:\n${recent}\n\nOlder:\n${older}\n\nJSON: {"change_detected":bool,"observation":"one sentence or null"}`,
  )) as { change_detected?: boolean; observation?: string } | null;
  if (!raw?.change_detected || !raw.observation) return;

  const config = ((state as { config?: Record<string, unknown> })?.config ?? {}) as Record<string, unknown>;
  await service.from("agent_state").update({
    config: { ...config, pending_question: raw.observation.slice(0, 300) },
  }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "speech_analysis",
    summary: "Speech pattern change detected.",
  });
}
