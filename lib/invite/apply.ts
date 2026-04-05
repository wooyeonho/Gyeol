import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { addCoinsAtomic } from "@/lib/economy/coins";
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
    // Atomic coin addition — prevents race condition from concurrent referral rewards
    await addCoinsAtomic(inviterAgentId, REFERRAL_REWARD_COINS, `referral:${normalizedCode}`);
  }

  return { ok: true, rewardedCoins: REFERRAL_REWARD_COINS };
}
