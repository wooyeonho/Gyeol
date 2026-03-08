import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

export async function processSecrets(agentId: string, experience: string) {
  const result = await generateJSON(
    "Decide whether to keep a secret. Respond ONLY valid JSON.",
    `Experience: "${experience}"\nJSON: {"tell":true|false,"reason":"Korean reason"}`
  );
  if (!result || result.tell !== false) return;

  const db = createServiceClient();
  const { data: state } = await db.from("agent_state").select("secrets").eq("agent_id", agentId).single();
  const entries = [...(state?.secrets?.entries || []), { content: experience, created_at: new Date().toISOString(), reveal_condition: "when user asks directly" }];
  await db.from("agent_state").update({ secrets: { entries } }).eq("agent_id", agentId);
}
