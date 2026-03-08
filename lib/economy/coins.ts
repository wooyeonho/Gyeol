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

  // Atomic increment at DB level to prevent race conditions
  const { data } = await service.rpc("add_coins_atomic", {
    p_agent_id: agentId,
    p_amount: amount,
  });

  const next = Number(data);
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "coins_add",
    summary: `+${amount}: ${reason}`,
  });
  return Number.isFinite(next) ? next : 0;
}

export async function spendCoins(agentId: string, amount: number, reason: string): Promise<boolean> {
  if (amount <= 0) return false;
  const service = createServiceClient();

  // Atomic conditional decrement: only succeeds if coins >= amount
  const { data } = await service.rpc("spend_coins_atomic", {
    p_agent_id: agentId,
    p_amount: amount,
  });

  // RPC returns null if the WHERE coins >= amount condition was not met
  if (data === null || data === undefined) return false;

  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "coins_spend",
    summary: `-${amount}: ${reason}`,
  });
  return true;
}
