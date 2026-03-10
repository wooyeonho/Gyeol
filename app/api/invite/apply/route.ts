import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

const REFERRAL_REWARD_COINS = Math.max(0, Number(process.env.REFERRAL_REWARD_COINS ?? 10));

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim().toLowerCase() : null;
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

    const service = createServiceClient();
    const { data: inviteRow } = await service
      .from("invite_codes")
      .select("user_id")
      .eq("code", code)
      .maybeSingle();

    if (!inviteRow) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    const inviterId = (inviteRow as { user_id: string }).user_id;
    if (inviterId === user.id) return NextResponse.json({ error: "Cannot self-refer" }, { status: 400 });

    const { data: existingReferral } = await service
      .from("referrals")
      .select("id")
      .eq("invitee_id", user.id)
      .maybeSingle();

    if (!existingReferral) {
      await service.from("referrals").insert({
        inviter_id: inviterId,
        invitee_id: user.id,
        code,
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
    }

    return NextResponse.json({ ok: true, rewarded_coins: existingReferral ? 0 : REFERRAL_REWARD_COINS });
  } catch (e) {
    console.error("POST /api/invite/apply error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
