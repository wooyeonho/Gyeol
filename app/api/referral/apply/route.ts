import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { referralApplyBodySchema, parseBody } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/referral/apply" });

const REFERRAL_REWARD_COINS = 100;

/**
 * POST /api/referral/apply
 * Body: { code: string }
 *
 * Redeems a referral/invite code for the current user.
 * Awards coins to both the referrer and the referred user.
 * Each user can only redeem one referral code.
 */
export async function POST(req: NextRequest) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`referral:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = await parseBody(req, referralApplyBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const code = parsed.data.code;

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
      log.error("referral insert error", insertError instanceof Error ? insertError : { detail: String(insertError) });
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    // 5. Award coins to both users via add_coins_atomic RPC
    // Ensure agents exist (new users may not have one yet — agents are created lazily)
    const [referrerResult, referredResult] = await Promise.all([
      ensurePrimaryAgent(service, invite.user_id),
      ensurePrimaryAgent(service, user.id),
    ]);

    // Award coins atomically (avoids read-then-write race condition)
    let coinsAwarded = true;
    if (referrerResult.agentId) {
      const { data: referrerData, error: referrerErr } = await service.rpc("add_coins_atomic", {
        p_agent_id: referrerResult.agentId,
        p_amount: REFERRAL_REWARD_COINS,
        p_reason: "referral_reward",
      });
      if (referrerErr || referrerData === false) {
        log.error("referral: failed to award coins to referrer", referrerErr instanceof Error ? referrerErr : { detail: String(referrerErr ?? "RPC returned false") });
        coinsAwarded = false;
      }
    } else {
      log.error("referral: could not resolve agent for referrer", { detail: String(invite.user_id) });
      coinsAwarded = false;
    }
    if (referredResult.agentId) {
      const { data: referredData, error: referredErr } = await service.rpc("add_coins_atomic", {
        p_agent_id: referredResult.agentId,
        p_amount: REFERRAL_REWARD_COINS,
        p_reason: "referral_reward",
      });
      if (referredErr || referredData === false) {
        log.error("referral: failed to award coins to referred user", referredErr instanceof Error ? referredErr : { detail: String(referredErr ?? "RPC returned false") });
        coinsAwarded = false;
      }
    } else {
      log.error("referral: could not resolve agent for referred user", { detail: String(user.id) });
      coinsAwarded = false;
    }

    return NextResponse.json({
      success: true,
      reward: REFERRAL_REWARD_COINS,
      coinsAwarded,
      message: coinsAwarded
        ? `Both you and your friend received ${REFERRAL_REWARD_COINS} coins!`
        : "Referral recorded. Coins will be credited once your profile is ready.",
    });
  } catch (e) {
    log.error("POST /api/referral/apply error", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
