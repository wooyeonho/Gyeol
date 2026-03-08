import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { generateImage } from "@/lib/artifacts/image-gen";

/**
 * Infer user emotion from recent behavior/observations and generate an abstract image.
 * G4: "You seemed to feel like this today." -> image artifact.
 */
export async function tryInferEmotionImage(agentId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data: stateRow } = await service
    .from("agent_state")
    .select("pending_concern, self_model, config")
    .eq("agent_id", agentId)
    .single();
  const concern = (stateRow as { pending_concern?: string })?.pending_concern;
  const observations = (stateRow as { self_model?: { observations?: string[] } })?.self_model?.observations ?? [];
  if (!concern && observations.length === 0) return false;

  const recent = [...observations].slice(-5).join(". ");
  const hint = concern ? `Recent concern: ${concern}. ` : "";
  const raw = (await generateJSON(
    "From behavior/observation hints, infer one abstract emotion or mood. One word or short phrase in English for image prompt.",
    `${hint}Observations: ${recent || "none"}\n\nJSON: {"emotion":"e.g. melancholy, restlessness, quiet_joy"}`,
  )) as { emotion?: string } | null;
  const emotion = raw?.emotion ? String(raw.emotion).replace(/[^a-zA-Z0-9_\s]/g, "").slice(0, 50) : "contemplative";
  const prompt = `abstract, non-literal, emotional state: ${emotion}, soft colors, no text`;
  const imageUrl = await generateImage(agentId, "mood", prompt);
  if (!imageUrl) return false;

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await service.from("artifacts").insert({
    agent_id: agentId,
    type: "emotion_image",
    content: JSON.stringify({ image: imageUrl, inferred_emotion: emotion }),
    expires_at: expiresAt,
    is_preserved: false,
  });
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "emotion_image",
    summary: `Inferred emotion: ${emotion}.`,
  });
  return true;
}
