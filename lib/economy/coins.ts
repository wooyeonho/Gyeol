import { createServiceClient } from "@/lib/supabase/service";

export async function getBalance(agentId: string): Promise<number> {
  const db = createServiceClient();
  const { data } = await db.from("agent_state").select("coins").eq("agent_id", agentId).single();
  return data?.coins ?? 0;
}

/**
 * @deprecated Use {@link addCoinsAtomic} instead to avoid race conditions.
 */
export async function addCoins(agentId: string, amount: number, reason: string) {
  // Delegate to atomic version to prevent race conditions
  await addCoinsAtomic(agentId, amount, reason);
}

/**
 * @deprecated Use {@link spendCoinsAtomic} instead to avoid race conditions.
 */
export async function spendCoins(agentId: string, amount: number, reason: string): Promise<boolean> {
  // Delegate to atomic version to prevent race conditions
  return spendCoinsAtomic(agentId, amount, reason);
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
