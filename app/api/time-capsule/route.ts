import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type TimeCapsuleRow = {
  id: string;
  message: string;
  deliver_at: string;
  delivered: boolean;
  created_at: string;
};

const MIN_DAYS = 1;
const MAX_DAYS = 365 * 10;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agentData } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agentData) return NextResponse.json({ capsules: [] });

    const now = new Date().toISOString();
    const { data } = await service
      .from("time_capsules")
      .select("id, message, deliver_at, delivered, created_at")
      .eq("agent_id", agentData.id)
      .order("deliver_at", { ascending: true });

    const capsules = ((data || []) as TimeCapsuleRow[]).map((c) => ({
      ...c,
      is_ready: !c.delivered && c.deliver_at <= now,
    }));

    const readyCapsules = capsules.filter((c) => c.is_ready);
    if (readyCapsules.length > 0) {
      await service
        .from("time_capsules")
        .update({ delivered: true })
        .in("id", readyCapsules.map((c) => c.id));
    }

    return NextResponse.json({ capsules });
  } catch (e) {
    console.error("[TimeCapsuleGET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, deliver_at } = (await req.json()) as { message?: string; deliver_at?: string };
    if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });
    if (!deliver_at) return NextResponse.json({ error: "deliver_at required" }, { status: 400 });

    const deliverDate = new Date(deliver_at);
    if (isNaN(deliverDate.getTime())) return NextResponse.json({ error: "Invalid deliver_at date" }, { status: 400 });

    const daysFromNow = (deliverDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysFromNow < MIN_DAYS) return NextResponse.json({ error: `최소 ${MIN_DAYS}일 후로 설정해야 합니다` }, { status: 400 });
    if (daysFromNow > MAX_DAYS) return NextResponse.json({ error: `최대 ${MAX_DAYS / 365}년 후까지 설정 가능합니다` }, { status: 400 });

    const service = createServiceClient();
    const { data: agentData } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agentData) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: existing } = await service
      .from("time_capsules")
      .select("id")
      .eq("agent_id", agentData.id)
      .eq("delivered", false)
      .limit(10);

    if ((existing || []).length >= 10) {
      return NextResponse.json({ error: "미전달 타임캡슐은 최대 10개까지 보관할 수 있습니다" }, { status: 400 });
    }

    const { data: capsule } = await service.from("time_capsules").insert({
      agent_id: agentData.id,
      message: message.trim().slice(0, 2000),
      deliver_at: deliverDate.toISOString(),
      delivered: false,
    }).select("id, deliver_at").single();

    await service.from("autonomous_logs").insert({
      agent_id: agentData.id,
      action_type: "time_capsule_created",
      summary: `타임캡슐 생성 → ${deliverDate.toLocaleDateString("ko-KR")} 전달 예정`,
    });

    return NextResponse.json({ success: true, capsule_id: capsule?.id, deliver_at: capsule?.deliver_at });
  } catch (e) {
    console.error("[TimeCapsulePOST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
