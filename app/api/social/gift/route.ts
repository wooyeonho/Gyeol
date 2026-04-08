import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addCoinsAtomic, spendCoinsAtomic } from "@/lib/economy/coins";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { socialGiftBodySchema, parseBody } from "@/lib/validation/schemas";
import { verifyCsrfOrigin } from "@/lib/security/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`social-gift:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const parsed = await parseBody(req, socialGiftBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const targetAgentId = parsed.data.target_agent_id;
    const coins = parsed.data.coins;
    const message = sanitizeUserInput(parsed.data.message);

    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!myAgent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });
    if (myAgent.id === targetAgentId) return NextResponse.json({ error: "Cannot gift yourself" }, { status: 400 });

    const { data: targetExists } = await service.from("agents").select("id").eq("id", targetAgentId).single();
    if (!targetExists?.id) return NextResponse.json({ error: "Target agent not found" }, { status: 404 });

    const spent = await spendCoinsAtomic(myAgent.id, coins, `social_gift:${targetAgentId}`);
    if (!spent) return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });
    await addCoinsAtomic(targetAgentId, coins, `social_gift_from:${myAgent.id}`);

    const summary = message || `${coins} coins gifted`;
    const socialInsert = await service.from("social_logs").insert({
      agent_a_id: myAgent.id,
      agent_b_id: targetAgentId,
      conversation: summary,
      topic: "gift",
      outcome: `${coins} coins transferred`,
    });
    if (socialInsert.error) {
      await service.from("social_logs").insert({
        agent_a_id: myAgent.id,
        agent_b_id: targetAgentId,
        message: summary,
      });
    }

    await service.from("autonomous_logs").insert([
      {
        agent_id: myAgent.id,
        action_type: "gift_sent",
        summary: `Sent ${coins} coins`,
      },
      {
        agent_id: targetAgentId,
        action_type: "gift_received",
        summary: `Received ${coins} coins`,
      },
    ]);

    return NextResponse.json({ ok: true, coins, target_agent_id: targetAgentId });
  } catch (e) {
    console.error("social/gift POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
