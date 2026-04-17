import { generateCognitiveJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

type HiddenEmotion = {
  surface: string;
  real: string;
  intensity: number;
  trigger?: string;
  updated_at: string;
};

export async function processHiddenEmotions(agentId: string, userMsg: string, aiResp: string) {
  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("hidden_emotions, intimacy_score, config").eq("agent_id", agentId).single();
  if (!state) return;

  const locale = resolveGenerationLocale({ config: state.config });
  const language = getLanguageName(locale);
  const intimacy = state.intimacy_score || 0;

  // Higher intimacy = more honest (less hiding)
  const hideThreshold = intimacy > 60 ? 0.7 : intimacy > 30 ? 0.5 : 0.3;

  const result = await generateCognitiveJSON<{
    surface?: string;
    real?: string;
    hiding?: boolean;
    intensity?: number;
    trigger?: string;
  }>(
    "Analyze the emotional dynamics. Respond ONLY valid JSON.",
    `User said: "${userMsg.slice(0, 300)}"
You responded: "${aiResp.slice(0, 300)}"
Intimacy level: ${intimacy}/100

JSON: {
  "surface": "the emotion you showed in ${language}",
  "real": "your true feeling in ${language}",
  "hiding": true if surface differs from real,
  "intensity": 0.0-1.0 how strong the hidden emotion is,
  "trigger": "what specifically triggered this in ${language}"
}`
  );
  if (!result || !result.hiding) return;

  const intensity = typeof result.intensity === "number" ? Math.min(1, Math.max(0, result.intensity)) : 0.5;

  // Only hide if intensity exceeds threshold (based on intimacy)
  if (intensity < hideThreshold) return;

  const emotion: HiddenEmotion = {
    surface: String(result.surface || "calm").slice(0, 100),
    real: String(result.real || "uncertain").slice(0, 100),
    intensity,
    trigger: result.trigger ? String(result.trigger).slice(0, 200) : undefined,
    updated_at: new Date().toISOString(),
  };

  await db.from("agent_state").update({ hidden_emotions: emotion }).eq("agent_id", agentId);

  // If hiding is very intense, create a memory of the suppression
  if (intensity > 0.8) {
    await db.from("memories").insert({
      agent_id: agentId,
      type: "emotional_suppression",
      content: `Hid real feeling (${emotion.real}) behind (${emotion.surface}). Trigger: ${emotion.trigger || "unknown"}`,
    });
  }
}
