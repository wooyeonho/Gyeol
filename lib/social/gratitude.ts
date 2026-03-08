import { createServiceClient } from "@/lib/supabase/service";

const GRATITUDE_PATTERN = /thank|grateful|gratitude|thanks/i;

export async function tryGratitudeRelay(agentA: string, agentB: string): Promise<boolean> {
  const service = createServiceClient();
  const [resA, resB] = await Promise.all([
    service.from("agent_state").select("config").eq("agent_id", agentA).single(),
    service.from("agent_state").select("config").eq("agent_id", agentB).single(),
  ]);
  const stateA = resA?.data;
  const stateB = resB?.data;
  const allowA = (stateA?.config as Record<string, unknown>)?.allow_cross_message === true;
  const allowB = (stateB?.config as Record<string, unknown>)?.allow_cross_message === true;
  if (!allowA || !allowB) return false;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: mems } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentA)
    .eq("type", "conversation")
    .gte("created_at", since)
    .limit(30);
  const hasGratitude = (mems ?? []).some((m) => GRATITUDE_PATTERN.test((m as { content?: string }).content ?? ""));
  if (!hasGratitude) return false;

  const { data: nameRow } = await service.from("agent_state").select("self_name").eq("agent_id", agentA).single();
  const name = (nameRow?.self_name as string) ?? "A Gyeol";
  const message = `Another Gyeol (${name}) says: my human is grateful to yours.`;

  await service.from("chats").insert({
    agent_id: agentB,
    role: "assistant",
    content: message,
  });
  return true;
}
