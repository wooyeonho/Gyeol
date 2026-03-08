import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetDate = body.target_date as string | undefined;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!targetDate || !message) {
      return NextResponse.json({ error: "target_date and message required" }, { status: 400 });
    }

    const targetTime = new Date(targetDate).getTime();
    if (isNaN(targetTime)) return NextResponse.json({ error: "Invalid target_date" }, { status: 400 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: memoriesBefore } = await service
      .from("memories")
      .select("id, content, type, created_at")
      .eq("agent_id", agentId)
      .lte("created_at", new Date(targetTime + 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(30);
    const pastMemories = (memoriesBefore ?? []).map((m) => (m as { content?: string }).content ?? "").filter(Boolean);

    const { data: chatsBefore } = await service
      .from("chats")
      .select("role, content")
      .eq("agent_id", agentId)
      .lte("created_at", new Date(targetTime + 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(15);
    const pastChats = ((chatsBefore ?? []).reverse()) as { role: string; content: string }[];

    const { data: stateRow } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
    const agentState = (stateRow ?? {}) as Record<string, unknown>;
    const pastState = {
      ...agentState,
      fragments: (agentState.fragments as string[]) ?? [],
      self_model: { observations: [] },
    };

    const systemPrompt =
      buildSystemPrompt({
        agentState: pastState,
        memories: pastMemories.map((c) => ({ content: c })),
        recentChats: pastChats,
        autonomousLogs: [],
        worldState: null,
      }) +
      "\n\nYou are responding as your past self at that time. Tone and knowledge are limited to what you had then. Reply in Korean if the user wrote in Korean.";

    const messages = [
      ...pastChats.map((c) => ({ role: c.role, content: c.content })),
      { role: "user" as const, content: message },
    ];
    const stream = await generateText(systemPrompt, messages);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("time-travel error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
