import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getBalance, spendCoinsAtomic } from "@/lib/economy/coins";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validation/schemas";
import { redeemBodySchema } from "@/lib/validation/schemas";
import { NextRequest, NextResponse } from "next/server";

const COIN_TO_KRW_RATE = 10;

export async function POST(request: NextRequest) {
  try {
    // CSRF protection — financial route must originate from our domain
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limiting — prevent abuse of financial endpoint (stricter: 5/min)
    const allowed = await checkRateLimit(`redeem:${user.id}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Zod validation
    const parsed = await parseBody(request, redeemBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { coins } = parsed.data;

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const balance = await getBalance(agentId);
    if (balance < coins) {
      return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });
    }

    const ok = await spendCoinsAtomic(agentId, coins, "redeem_to_krw");
    if (!ok) return NextResponse.json({ error: "Spend failed" }, { status: 500 });

    const krw = coins * COIN_TO_KRW_RATE;
    await service.from("redemption_requests").insert({
      user_id: user.id,
      agent_id: agentId,
      coins_amount: coins,
      krw_requested: krw,
      status: "pending",
    });

    return NextResponse.json({ ok: true, krw_requested: krw, status: "pending" });
  } catch (e) {
    console.error("earnings/redeem POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ requests: [], rate: COIN_TO_KRW_RATE });

    const { data: requests } = await service
      .from("redemption_requests")
      .select("id, coins_amount, krw_requested, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ requests: requests ?? [], rate: COIN_TO_KRW_RATE });
  } catch (e) {
    console.error("earnings/redeem GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
