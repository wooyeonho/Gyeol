import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addCoins, getBalance, spendCoins } from "@/lib/economy/coins";
import { sanitizeUserInput } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { target_agent_id?: unknown; amount?: unknown; message?: unknown };
    const targetAgentId = typeof body.target_agent_id === "string" ? body.target_agent_id : "";
    const amount = Math.max(0, Math.floor(Number(body.amount ?? 0)));
    const message = typeof body.message === "string" ? sanitizeUserInput(body.message) : "";
    if (!targetAgentId || amount <= 0) {
      return NextResponse.json({ error: "target_agent_id and positive amount required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: myAgent } = await service
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const fromAgentId = myAgent?.id;
    if (!fromAgentId) return NextResponse.json({ error: "No agent" }, { status: 404 });
    if (fromAgentId === targetAgentId) {
      return NextResponse.json({ error: "Cannot gift to yourself" }, { status: 400 });
    }

    const { data: targetAgent } = await service.from("agents").select("id").eq("id", targetAgentId).maybeSingle();
    if (!targetAgent?.id) return NextResponse.json({ error: "Target agent not found" }, { status: 404 });

    const paid = await spendCoins(fromAgentId, amount, `social gift -> ${targetAgentId}`);
    if (!paid) return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });
    await addCoins(targetAgentId, amount, `social gift <- ${fromAgentId}`);

    await service.from("social_logs").insert({
      agent_a_id: fromAgentId,
      agent_b_id: targetAgentId,
      message: message || `Gifted ${amount} coins.`,
    });

    const [fromBalance, toBalance] = await Promise.all([
      getBalance(fromAgentId),
      getBalance(targetAgentId),
    ]);
    return NextResponse.json({
      ok: true,
      amount,
      from_agent_id: fromAgentId,
      target_agent_id: targetAgentId,
      from_balance: fromBalance,
      target_balance: toBalance,
    });
  } catch (error) {
    console.error("POST /api/social/gift error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
