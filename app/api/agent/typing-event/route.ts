import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { is_typing?: unknown; ttl_ms?: unknown };
    const isTyping = body.is_typing !== false;
    const ttlMs = Math.max(1000, Math.min(30_000, Number(body.ttl_ms ?? 8000)));

    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).limit(1).maybeSingle();
    const myAgentId = myAgent?.id;
    if (!myAgentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: state } = await service.from("agent_state").select("config").eq("agent_id", myAgentId).single();
    const config = ((state?.config as Record<string, unknown> | null) ?? {});
    const typingUntil = isTyping ? new Date(Date.now() + ttlMs).toISOString() : null;
    await service.from("agent_state").update({
      config: {
        ...config,
        typing_until: typingUntil,
      },
    }).eq("agent_id", myAgentId);

    return NextResponse.json({ ok: true, typing_until: typingUntil });
  } catch (error) {
    console.error("POST /api/agent/typing-event error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: myAgent } = await service.from("agents").select("id").eq("user_id", user.id).limit(1).maybeSingle();
    const myAgentId = myAgent?.id;
    if (!myAgentId) return NextResponse.json({ is_typing: false, typing_until: null });

    const { data: state } = await service.from("agent_state").select("config").eq("agent_id", myAgentId).single();
    const config = (state?.config as Record<string, unknown> | null) ?? {};
    const typingUntil = typeof config.typing_until === "string" ? config.typing_until : null;
    const isTyping = Boolean(typingUntil && new Date(typingUntil).getTime() > Date.now());
    return NextResponse.json({ is_typing: isTyping, typing_until: typingUntil });
  } catch (error) {
    console.error("GET /api/agent/typing-event error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
