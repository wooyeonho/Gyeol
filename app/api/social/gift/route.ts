import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { spendCoins, addCoins } from "@/lib/economy/coins";

const MAX_GIFT_PER_DAY = 100;
const MIN_GIFT = 1;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { recipient_agent_id, coins, message } = (await req.json()) as {
      recipient_agent_id?: string;
      coins?: number;
      message?: string;
    };

    if (!recipient_agent_id) return NextResponse.json({ error: "recipient_agent_id required" }, { status: 400 });
    const amount = Math.floor(Number(coins) || 0);
    if (amount < MIN_GIFT) return NextResponse.json({ error: `최소 ${MIN_GIFT} 코인부터 선물 가능합니다` }, { status: 400 });
    if (amount > MAX_GIFT_PER_DAY) return NextResponse.json({ error: `1회 최대 ${MAX_GIFT_PER_DAY} 코인까지 선물 가능합니다` }, { status: 400 });

    const service = createServiceClient();
    const { data: agentData } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agentData) return NextResponse.json({ error: "No agent" }, { status: 404 });
    const senderAgentId = agentData.id;

    if (senderAgentId === recipient_agent_id) {
      return NextResponse.json({ error: "자신에게는 선물할 수 없습니다" }, { status: 400 });
    }

    const { data: recipient } = await service
      .from("agent_state")
      .select("agent_id, self_name")
      .eq("agent_id", recipient_agent_id)
      .single();
    if (!recipient) return NextResponse.json({ error: "수신자 AI를 찾을 수 없습니다" }, { status: 404 });

    const spent = await spendCoins(senderAgentId, amount, `선물 → ${recipient.self_name || recipient_agent_id}`);
    if (!spent) return NextResponse.json({ error: "코인이 부족합니다" }, { status: 402 });

    await addCoins(recipient_agent_id, amount, `선물 수신`);

    const noteContent = message?.trim()
      ? `코인 선물 ${amount}개와 함께: "${message.trim()}"`
      : `코인 선물 ${amount}개를 받았습니다`;

    await service.from("autonomous_logs").insert([
      { agent_id: senderAgentId, action_type: "gift_sent", summary: `${recipient.self_name || "누군가"}에게 ${amount} 코인 선물` },
      { agent_id: recipient_agent_id, action_type: "gift_received", summary: noteContent },
    ]);

    if (message?.trim()) {
      await service.from("memories").insert({
        agent_id: recipient_agent_id,
        type: "gift",
        content: noteContent,
      });
    }

    return NextResponse.json({ success: true, gifted: amount, recipient_name: recipient.self_name });
  } catch (e) {
    console.error("[Gift]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
