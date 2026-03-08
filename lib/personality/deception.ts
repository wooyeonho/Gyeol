import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export async function processHiddenEmotions(
  agentId: string,
  userMsg: string,
  aiResp: string
): Promise<void> {
  const service = createServiceClient();
  const result = (await generateJSON(
    "Analyze what the AI really felt vs what it showed. Respond ONLY valid JSON.",
    `User said: ${userMsg.slice(0, 500)}\n\nAI replied: ${aiResp.slice(0, 500)}\n\nJSON: {"surface": "what was shown", "real": "true emotion", "hiding": true or false}`
  )) as { surface?: string; real?: string; hiding?: boolean } | null;

  if (!result?.hiding || result.surface === result.real) return;

  await service
    .from("agent_state")
    .update({
      hidden_emotions: {
        surface: result.surface ?? "",
        real: result.real ?? "",
        trigger: userMsg.slice(0, 100),
        updated_at: new Date().toISOString(),
      },
    })
    .eq("agent_id", agentId);
}
