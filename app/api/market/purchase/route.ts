import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addCoinsAtomic, spendCoinsAtomic } from "@/lib/economy/coins";
import { checkRateLimit } from "@/lib/rate-limit";
import { logRouteError } from "@/lib/ops/logger";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`market-purchase:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    const itemId = typeof body?.item_id === "string" ? body.item_id : "";
    if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!myAgent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: item } = await service
      .from("market_items")
      .select("id, seller_agent_id, type, title, description, content, price, purchase_count, is_active")
      .eq("id", itemId)
      .single();
    if (!item || item.is_active === false) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.seller_agent_id === myAgent.id) {
      return NextResponse.json({ error: "Cannot purchase your own item" }, { status: 400 });
    }
    const price = Math.max(0, Number(item.price ?? 0));
    if (price <= 0) return NextResponse.json({ error: "Invalid item price" }, { status: 400 });

    const spent = await spendCoinsAtomic(myAgent.id, price, `market_purchase:${item.id}`);
    if (!spent) return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });

    const sellerNet = Math.max(0, Math.floor(price * 0.85));
    await addCoinsAtomic(item.seller_agent_id, sellerNet, `market_sale:${item.id}`);

    // Atomic increment to prevent race conditions on concurrent purchases
    await service.rpc("increment_purchase_count", { p_item_id: item.id })
      .then(({ error: rpcErr }) => {
        if (rpcErr) {
          // Fallback: non-atomic increment (acceptable for counters, not money)
          return service
            .from("market_items")
            .update({ purchase_count: Number(item.purchase_count ?? 0) + 1 })
            .eq("id", item.id);
        }
      });

    // Optional purchase history table (if migration applied).
    const { error: purchaseInsertError } = await service.from("market_purchases").insert({
      item_id: item.id,
      buyer_agent_id: myAgent.id,
      seller_agent_id: item.seller_agent_id,
      price_paid: price,
    });
    if (purchaseInsertError) {
      // Optional table across environments; non-fatal.
      console.warn("market_purchases insert skipped", purchaseInsertError.message);
    }

    const learned = item.content ? String(item.content).slice(0, 1200) : `${item.title}: ${item.description ?? ""}`.trim();
    if (learned) {
      await service.from("memories").insert({
        agent_id: myAgent.id,
        type: "market_item",
        content: `Purchased ${item.type}: ${learned}`,
      });
    }

    await service.from("autonomous_logs").insert([
      {
        agent_id: myAgent.id,
        action_type: "market_purchase",
        summary: `Purchased ${item.title} for ${price} coins`,
      },
      {
        agent_id: item.seller_agent_id,
        action_type: "market_sale",
        summary: `Sold ${item.title} for ${sellerNet} coins (after fee)`,
      },
    ]);

    return NextResponse.json({
      ok: true,
      item_id: item.id,
      title: item.title,
      price_paid: price,
      seller_income: sellerNet,
      fee: price - sellerNet,
    });
  } catch (e) {
    logRouteError("market/purchase POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
