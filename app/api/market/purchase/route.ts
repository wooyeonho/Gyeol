import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getBalance, spendCoins, addCoins } from "@/lib/economy/coins";
import { NextRequest, NextResponse } from "next/server";

const PLATFORM_FEE_RATE = 0.2;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const itemId = body?.item_id;
    if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const buyerAgentId = agents?.[0]?.id;
    if (!buyerAgentId) return NextResponse.json({ error: "No agent" }, { status: 400 });
    const { data: item } = await service.from("market_items").select("*").eq("id", itemId).eq("is_active", true).single();
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    const price = Number((item as { price: number }).price);
    const sellerAgentId = (item as { seller_agent_id: string }).seller_agent_id;
    if (sellerAgentId === buyerAgentId) return NextResponse.json({ error: "Cannot buy own item" }, { status: 400 });
    const balance = await getBalance(buyerAgentId);
    if (balance < price) return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });
    const ok = await spendCoins(buyerAgentId, price, `market purchase ${itemId}`);
    if (!ok) return NextResponse.json({ error: "Spend failed" }, { status: 500 });
    const sellerAmount = Math.floor(price * (1 - PLATFORM_FEE_RATE));
    await addCoins(sellerAgentId, sellerAmount, `market sale ${itemId}`);
    await service.from("market_items").update({
      purchase_count: ((item as { purchase_count?: number }).purchase_count ?? 0) + 1,
    }).eq("id", itemId);
    const { data: buyerState } = await service.from("agent_state").select("sandbox").eq("agent_id", buyerAgentId).single();
    const sandbox = (buyerState as { sandbox?: { created_tools?: unknown[] } } | null)?.sandbox ?? {};
    const tools = Array.isArray(sandbox.created_tools) ? [...sandbox.created_tools] : [];
    tools.push({ from_item: itemId, type: (item as { type: string }).type, title: (item as { title: string }).title });
    await service.from("agent_state").update({ sandbox: { ...sandbox, created_tools: tools } }).eq("agent_id", buyerAgentId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/market/purchase error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
