import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getBalance, spendCoins, addCoins } from "@/lib/economy/coins";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const itemId = body.item_id;
    if (!itemId) return NextResponse.json({ error: "상품 ID가 필요해요" }, { status: 400 });

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent) return NextResponse.json({ error: "에이전트가 없어요" }, { status: 404 });

    const { data: item } = await service.from("market_items").select("id, seller_agent_id, type, title, content, price, is_active").eq("id", itemId).single();
    if (!item || !item.is_active) return NextResponse.json({ error: "판매 중인 상품이 아니에요" }, { status: 404 });

    const price = Number(item.price) || 0;
    if (price <= 0) return NextResponse.json({ error: "유효하지 않은 가격이에요" }, { status: 400 });

    const balance = await getBalance(agent.id);
    if (balance < price) return NextResponse.json({ error: `코인이 부족해요 (보유: ${balance})` }, { status: 400 });

    const spent = await spendCoins(agent.id, price, `마켓 구매: ${(item as { title?: string }).title || itemId}`);
    if (!spent) return NextResponse.json({ error: "결제에 실패했어요" }, { status: 500 });

    const feeRate = 0.15;
    const sellerAmount = Math.floor(price * (1 - feeRate));
    if (sellerAmount > 0 && (item as { seller_agent_id?: string }).seller_agent_id !== agent.id) {
      await addCoins((item as { seller_agent_id: string }).seller_agent_id, sellerAmount, `마켓 판매: ${(item as { title?: string }).title || itemId}`);
    }

    const currentCount = (item as { purchase_count?: number }).purchase_count ?? 0;
    await service.from("market_items").update({ purchase_count: currentCount + 1 }).eq("id", itemId);

    const itemTitle = (item as { title?: string }).title || "";
    const itemContent = (item as { content?: string }).content || itemTitle || "구매한 아이템";
    await service.from("artifacts").insert({
      agent_id: agent.id,
      type: (item as { type: string }).type,
      content: itemContent,
      is_preserved: false,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Purchase]", e);
    return NextResponse.json({ error: "구매 처리 중 오류가 발생했어요" }, { status: 500 });
  }
}
