import { createServiceClient } from "@/lib/supabase/service";

export async function getBalance(agentId: string): Promise<number> {
  const db = createServiceClient();
  const { data } = await db.from("agent_state").select("coins").eq("agent_id", agentId).single();
  return data?.coins ?? 0;
}

export async function addCoins(agentId: string, amount: number, reason: string) {
  const db = createServiceClient();
  const { data } = await db.from("agent_state").select("coins").eq("agent_id", agentId).single();
  const current = data?.coins || 0;
  await db.from("agent_state").update({ coins: current + amount }).eq("agent_id", agentId);
  await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "coins_add", summary: `+${amount} coins: ${reason}` });
}

export async function spendCoins(agentId: string, amount: number, reason: string): Promise<boolean> {
  const db = createServiceClient();
  const { data } = await db.from("agent_state").select("coins").eq("agent_id", agentId).single();
  const current = data?.coins || 0;
  if (current < amount) return false;
  await db.from("agent_state").update({ coins: current - amount }).eq("agent_id", agentId);
  await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "coins_spend", summary: `-${amount} coins: ${reason}` });
  return true;
}

export async function spendCoinsAtomic(agentId: string, amount: number, reason: string): Promise<boolean> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("spend_coins_atomic", {
    p_agent_id: agentId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) {
    throw new Error(`[Coins] spend_coins_atomic RPC failed: ${error.message}`);
  }
  return typeof data === "boolean" ? data : false;
}

export async function addCoinsAtomic(agentId: string, amount: number, reason: string): Promise<boolean> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("add_coins_atomic", {
    p_agent_id: agentId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) {
    throw new Error(`[Coins] add_coins_atomic RPC failed: ${error.message}`);
  }
  return typeof data === "boolean" ? data : true;
}
