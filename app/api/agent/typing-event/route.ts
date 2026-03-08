import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { recordTypingEvent, recordVisitNoMessage } from "@/lib/personality/silence";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const event = body?.event === "blur" ? "blur" : body?.event === "view_only" ? "view_only" : null;
    const hadContent = Boolean(body?.had_content);
    if (!event) return NextResponse.json({ error: "event required (blur|view_only)" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ ok: false });

    if (event === "view_only") await recordVisitNoMessage(agentId);
    else await recordTypingEvent(agentId, event, hadContent);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/agent/typing-event error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
