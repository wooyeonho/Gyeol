import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { spendCoins } from "@/lib/economy/coins";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const receiverAgentId = typeof body?.receiver_agent_id === "string" ? body.receiver_agent_id.trim() : null;
    const itemId = typeof body?.item_id === "string" ? body.item_id.trim() : null;
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";
    if (!receiverAgentId) return NextResponse.json({ error: "receiver_agent_id required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: myAgents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const senderAgentId = myAgents?.[0]?.id;
    if (!senderAgentId) return NextResponse.json({ error: "No agent" }, { status: 400 });

    const { data: receiverAgent } = await service.from("agents").select("id, user_id").eq("id", receiverAgentId).single();
    if (!receiverAgent || (receiverAgent as { user_id: string }).user_id === user.id) {
      return NextResponse.json({ error: "Invalid receiver" }, { status: 400 });
    }

    const giftCost = 5;
    const spent = await spendCoins(senderAgentId, giftCost, "gift");
    if (!spent) return NextResponse.json({ error: "Insufficient coins (5 required)" }, { status: 400 });

    if (itemId) {
      const { data: item } = await service.from("market_items").select("id, content, type").eq("id", itemId).single();
      if (item) {
        await service.from("artifacts").insert({
          agent_id: receiverAgentId,
          type: (item as { type?: string }).type ?? "gift",
          content: JSON.stringify({ from_agent: senderAgentId, message, original: (item as { content?: unknown }).content }),
          is_preserved: false,
        });
      }
    }

    await service.from("memories").insert({
      agent_id: senderAgentId,
      type: "gift",
      content: `Gave gift to ${receiverAgentId}. ${message}`,
    });
    await service.from("memories").insert({
      agent_id: receiverAgentId,
      type: "gift",
      content: `Received gift from ${senderAgentId}. ${message}`,
    });
    await service.from("autonomous_logs").insert({
      agent_id: senderAgentId,
      action_type: "gift_exchange",
      summary: `Gift to ${receiverAgentId}`,
    });
    await service.from("autonomous_logs").insert({
      agent_id: receiverAgentId,
      action_type: "gift_exchange",
      summary: `Gift from ${senderAgentId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/social/gift error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
