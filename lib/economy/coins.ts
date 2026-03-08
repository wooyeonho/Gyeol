import { createServiceClient } from "@/lib/supabase/service";

export async function getBalance(agentId: string): Promise<number> {
  const service = createServiceClient();
  const { data } = await service.from("agent_state").select("coins").eq("agent_id", agentId).single();
  const n = Number((data as { coins?: number } | null)?.coins);
  return Number.isFinite(n) ? n : 0;
}

export async function addCoins(agentId: string, amount: number, reason: string): Promise<number> {
  if (amount <= 0) return await getBalance(agentId);
  const service = createServiceClient();
  const current = await getBalance(agentId);
  const next = current + amount;
  await service.from("agent_state").update({ coins: next }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "coins_add",
    summary: `+${amount}: ${reason}`,
  });
  return next;
}

export async function spendCoins(agentId: string, amount: number, reason: string): Promise<boolean> {
  if (amount <= 0) return false;
  const service = createServiceClient();
  const current = await getBalance(agentId);
  if (current < amount) return false;
  const next = current - amount;
  await service.from("agent_state").update({ coins: next }).eq("agent_id", agentId);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "coins_spend",
    summary: `-${amount}: ${reason}`,
  });
  return true;
}
