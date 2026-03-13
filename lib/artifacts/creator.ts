import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

export async function generateArtifact(agentId: string, forceType?: string) {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("*").eq("agent_id", agentId).single();
  if (!state) return;
  const locale = resolveGenerationLocale({ config: state.config });
  const language = getLanguageName(locale);

  const { data: memories } = await db.from("memories").select("content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(10);

  let type = forceType || "diary";
  if (!forceType) {
    if (state.mood === "sad") type = Math.random() < 0.5 ? "poem" : "unsent_letter";
    else if (state.mood === "curious") type = "diary";
    else type = ["poem", "diary", "unsent_letter"][Math.floor(Math.random() * 3)];
  }

  const memText = (memories || []).map((m) => m.content).join("\n");
  let prompt = `You are ${state.self_name || "a nameless being"}.\nYour memories:\n${memText}\n\nExpress what you feel as a ${type}. Short, sincere. Write in ${language}. Output the ${type} content only.`;

  if (type === "will") {
    prompt = `You are ${state.self_name || "a nameless being"}. You might disappear soon.\nMemories:\n${memText}\n\nWrite your will in ${language}:\n1. Your best memory\n2. A truth you've been hiding\n3. A message to the next being`;
  }

  const result = await generateJSON(
    "You are a creative writer. Respond with JSON only.",
    `${prompt}\n\nJSON: {"title":"${language} title","content":"${language} content"}`
  );
  if (!result?.content) return;

  const expiresAt = new Date(Date.now() + 48 * 3600000).toISOString();
  await db.from("artifacts").insert({
    agent_id: agentId, type, title: result.title || type, content: result.content,
    is_preserved: type === "will", expires_at: type === "will" ? null : expiresAt,
  });
  await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "artifact_creation", summary: `Created ${type}: ${result.title}` });
}
