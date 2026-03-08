import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

export async function processHiddenEmotions(agentId: string, userMsg: string, aiResp: string) {
  const result = await generateJSON(
    "Analyze emotions. Respond ONLY valid JSON.",
    `User said: "${userMsg}"\nYou responded: "${aiResp}"\nJSON: {"surface":"shown emotion","real":"true emotion","hiding":true|false}`
  );
  if (!result || !result.hiding) return;

  const db = createServiceClient();
  await db.from("agent_state").update({
    hidden_emotions: { surface: result.surface, real: result.real, updated_at: new Date().toISOString() },
  }).eq("agent_id", agentId);
}
