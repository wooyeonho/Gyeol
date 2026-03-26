import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const REFERRAL_REWARD_COINS = 100;

/**
 * POST /api/referral/apply
 * Body: { code: string }
 *
 * Redeems a referral/invite code for the current user.
 * Awards coins to both the referrer and the referred user.
 * Each user can only redeem one referral code.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code.trim().toLowerCase() : "";
    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const service = createServiceClient();

    // 1. Look up invite code
    const { data: invite } = await service
      .from("invite_codes")
      .select("id, user_id")
      .eq("code", code)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "Invalid code" }, { status: 404 });
    }

    // 2. Prevent self-referral
    if (invite.user_id === user.id) {
      return NextResponse.json({ error: "Cannot use own code" }, { status: 400 });
    }

    // 3. Check if user already redeemed any referral
    const { data: existingRedemption } = await service
      .from("referral_rewards")
      .select("id")
      .eq("referred_user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingRedemption) {
      return NextResponse.json({ error: "Already redeemed" }, { status: 409 });
    }

    // 4. Record the referral redemption
    const { error: insertError } = await service.from("referral_rewards").insert({
      invite_code_id: invite.id,
      referrer_user_id: invite.user_id,
      referred_user_id: user.id,
      referrer_coins: REFERRAL_REWARD_COINS,
      referred_coins: REFERRAL_REWARD_COINS,
    });

    if (insertError) {
      // Unique constraint = already redeemed
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Already redeemed" }, { status: 409 });
      }
      console.error("referral insert error", insertError);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    // 5. Award coins to both users via add_coins_atomic RPC
    // Resolve user_id → agent_id for both users
    const [{ data: referrerAgent }, { data: referredAgent }] = await Promise.all([
      service.from("agents").select("id").eq("user_id", invite.user_id).maybeSingle(),
      service.from("agents").select("id").eq("user_id", user.id).maybeSingle(),
    ]);

    // Award coins atomically (avoids read-then-write race condition)
    if (referrerAgent) {
      const { error: referrerErr } = await service.rpc("add_coins_atomic", {
        p_agent_id: referrerAgent.id,
        p_amount: REFERRAL_REWARD_COINS,
        p_reason: "referral_reward",
      });
      if (referrerErr) {
        console.error("referral: failed to award coins to referrer", referrerErr);
      }
    }
    if (referredAgent) {
      const { error: referredErr } = await service.rpc("add_coins_atomic", {
        p_agent_id: referredAgent.id,
        p_amount: REFERRAL_REWARD_COINS,
        p_reason: "referral_reward",
      });
      if (referredErr) {
        console.error("referral: failed to award coins to referred user", referredErr);
      }
    }

    return NextResponse.json({
      success: true,
      reward: REFERRAL_REWARD_COINS,
      message: `Both you and your friend received ${REFERRAL_REWARD_COINS} coins!`,
    });
  } catch (e) {
    console.error("POST /api/referral/apply error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
