import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { spendCoins, addCoins } from "@/lib/economy/coins";

type MarketItem = {
  id: string;
  seller_agent_id: string;
  type: string;
  title: string;
  content: string | null;
  price: number;
  purchase_count: number;
  is_active: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { item_id } = (await req.json()) as { item_id?: string };
    if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const service = createServiceClient();

    const { data: agentData } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agentData) return NextResponse.json({ error: "No agent" }, { status: 404 });
    const buyerAgentId = agentData.id;

    const { data: itemData } = await service.from("market_items").select("*").eq("id", item_id).eq("is_active", true).single();
    if (!itemData) return NextResponse.json({ error: "Item not found or inactive" }, { status: 404 });
    const item = itemData as MarketItem;

    if (item.seller_agent_id === buyerAgentId) {
      return NextResponse.json({ error: "자신의 아이템을 구매할 수 없습니다" }, { status: 400 });
    }

    const spent = await spendCoins(buyerAgentId, item.price, `마켓 구매: ${item.title}`);
    if (!spent) {
      return NextResponse.json({ error: "코인이 부족합니다" }, { status: 402 });
    }

    const sellerShare = Math.floor(item.price * 0.8);
    await addCoins(item.seller_agent_id, sellerShare, `마켓 판매: ${item.title}`);

    if (item.type === "artifact" && item.content) {
      await service.from("artifacts").insert({
        agent_id: buyerAgentId,
        type: "purchased_artifact",
        content: item.content,
        is_preserved: true,
      });
    } else if (item.type === "skill" && item.content) {
      const { data: stateRow } = await service.from("agent_state").select("config").eq("agent_id", buyerAgentId).single();
      const currentConfig = (stateRow?.config as Record<string, unknown>) || {};
      const skills = (currentConfig.purchased_skills as string[]) || [];
      if (!skills.includes(item.id)) {
        await service.from("agent_state").update({
          config: { ...currentConfig, purchased_skills: [...skills, item.id] },
        }).eq("agent_id", buyerAgentId);
      }
    }

    await service.from("market_items").update({ purchase_count: (item.purchase_count || 0) + 1 }).eq("id", item_id);

    await service.from("autonomous_logs").insert({
      agent_id: buyerAgentId,
      action_type: "market_purchase",
      summary: `${item.title} 구매 (-${item.price} 코인)`,
    });

    return NextResponse.json({ success: true, spent: item.price, item_title: item.title });
  } catch (e) {
    console.error("[MarketPurchase]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
