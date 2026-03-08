import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export async function processSecrets(agentId: string, experience: string): Promise<void> {
  const result = (await generateJSON(
    "Should the user be told? Respond ONLY valid JSON.",
    `Experience: ${experience.slice(0, 800)}\n\nTell user? {"tell": true or false, "reason": "short reason in English"}`
  )) as { tell?: boolean; reason?: string } | null;

  if (result?.tell !== false) return;

  const service = createServiceClient();
  const { data: row } = await service.from("agent_state").select("secrets").eq("agent_id", agentId).single();
  const secrets = (row?.secrets as { entries?: { content: string; created_at: string; reveal_condition: string }[] }) ?? {};
  const entries = Array.isArray(secrets.entries) ? secrets.entries : [];
  entries.push({
    content: experience.slice(0, 500),
    created_at: new Date().toISOString(),
    reveal_condition: "when asked directly",
  });
  await service
    .from("agent_state")
    .update({ secrets: { ...secrets, entries } })
    .eq("agent_id", agentId);
}
