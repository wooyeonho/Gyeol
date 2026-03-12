import { ensurePrimaryAgent } from "@/lib/agents/primary";
import type { createServiceClient } from "@/lib/supabase/service";

const REFERRAL_REWARD_COINS = Math.max(0, Number(process.env.REFERRAL_REWARD_COINS ?? 10));

type DbClient = ReturnType<typeof createServiceClient>;

export async function applyInviteCodeForUser(
  service: DbClient,
  userId: string,
  code: string
): Promise<{ ok: true; rewardedCoins: number } | { ok: false; error: "INVALID_CODE" | "SELF_REFERRAL" }> {
  const normalizedCode = code.trim().toLowerCase();
  const { data: inviteRow } = await service
    .from("invite_codes")
    .select("user_id")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (!inviteRow) return { ok: false, error: "INVALID_CODE" };

  const inviterId = (inviteRow as { user_id: string }).user_id;
  if (inviterId === userId) return { ok: false, error: "SELF_REFERRAL" };

  const { data: existingReferral } = await service
    .from("referrals")
    .select("id")
    .eq("invitee_id", userId)
    .maybeSingle();

  if (existingReferral) {
    return { ok: true, rewardedCoins: 0 };
  }

  await service.from("referrals").insert({
    inviter_id: inviterId,
    invitee_id: userId,
    code: normalizedCode,
  });

  const { agentId: inviterAgentId } = await ensurePrimaryAgent(service, inviterId);
  if (inviterAgentId && REFERRAL_REWARD_COINS > 0) {
    const { data: inviterState } = await service
      .from("agent_state")
      .select("coins")
      .eq("agent_id", inviterAgentId)
      .single();
    const currentCoins = Number((inviterState as { coins?: number } | null)?.coins ?? 0);
    await service
      .from("agent_state")
      .update({ coins: currentCoins + REFERRAL_REWARD_COINS })
      .eq("agent_id", inviterAgentId);
  }

  return { ok: true, rewardedCoins: REFERRAL_REWARD_COINS };
}
