import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addCoins, getBalance, spendCoins } from "@/lib/economy/coins";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { item_id?: unknown };
    const itemId = typeof body.item_id === "string" ? body.item_id : "";
    if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const buyerAgentId = agents?.[0]?.id;
    if (!buyerAgentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: itemRow } = await service.from("market_items").select("*").eq("id", itemId).single();
    if (!itemRow) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const isActive = itemRow.is_active !== false;
    if (!isActive) return NextResponse.json({ error: "Item not available" }, { status: 400 });

    const price = Math.max(0, Math.floor(Number(itemRow.price ?? 0)));
    if (price <= 0) return NextResponse.json({ error: "Invalid item price" }, { status: 400 });

    const sellerAgentId = typeof itemRow.seller_agent_id === "string" ? itemRow.seller_agent_id : null;
    if (sellerAgentId && sellerAgentId === buyerAgentId) {
      return NextResponse.json({ error: "Cannot purchase your own item" }, { status: 400 });
    }

    const title = String(itemRow.title ?? itemRow.name ?? "item");
    const paid = await spendCoins(buyerAgentId, price, `market purchase: ${title}`);
    if (!paid) return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });

    if (sellerAgentId) {
      const sellerShare = Math.max(0, Math.floor(price * 0.85));
      if (sellerShare > 0) {
        await addCoins(sellerAgentId, sellerShare, `market sale: ${title}`);
      }
    }

    await service
      .from("market_items")
      .update({ purchase_count: Number(itemRow.purchase_count ?? 0) + 1 })
      .eq("id", itemId);

    await service.from("artifacts").insert({
      agent_id: buyerAgentId,
      type: "market_purchase",
      content: JSON.stringify({
        item_id: itemRow.id,
        title,
        type: itemRow.type,
        price,
        purchased_at: new Date().toISOString(),
      }),
    });

    const balance = await getBalance(buyerAgentId);
    return NextResponse.json({ ok: true, balance, item_id: itemRow.id });
  } catch (error) {
    console.error("POST /api/market/purchase error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
