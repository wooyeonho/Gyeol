import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/referral/stats
 *
 * Phase 3-3: Returns the referral progress for the currently logged-in
 * user. `invited` counts rows in the `referrals` table where they were
 * the inviter; `activated` counts entries in `referral_rewards` (which
 * is only written on successful activation); `coins_earned` sums the
 * referrer_coins column. All best-effort — the dashboard shows zeros
 * if any query fails rather than blocking the page.
 */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { count: invitedCount } = await service
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", user.id);

  const { data: rewardRows } = await service
    .from("referral_rewards")
    .select("referrer_coins")
    .eq("referrer_user_id", user.id);

  const rewards = (rewardRows ?? []) as Array<{ referrer_coins: number | null }>;
  const activated = rewards.length;
  const coins_earned = rewards.reduce(
    (sum, row) => sum + (row.referrer_coins ?? 0),
    0,
  );

  return NextResponse.json({
    invited: invitedCount ?? 0,
    activated,
    coins_earned,
  });
}
