import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai/router";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`time-travel:${user.id}`, {
      userId: user.id,
      maxPerWindow: 20,
      windowMs: 60_000,
    });
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = (await req.json()) as { target_date?: unknown; message?: unknown };
    const targetDateRaw = typeof body.target_date === "string" ? body.target_date : "";
    const message = typeof body.message === "string" ? sanitizeUserInput(body.message) : "";
    if (!targetDateRaw || !message) {
      return NextResponse.json({ error: "target_date and message required" }, { status: 400 });
    }
    const targetDate = new Date(targetDateRaw);
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Invalid target_date" }, { status: 400 });
    }
    if (targetDate.getTime() > Date.now()) {
      return NextResponse.json({ error: "target_date must be in the past" }, { status: 400 });
    }
    targetDate.setHours(23, 59, 59, 999);
    const targetIso = targetDate.toISOString();

    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });
    const agentId = agent.id;

    const [{ data: chats }, { data: memories }, { data: state }] = await Promise.all([
      supabase
        .from("chats")
        .select("role, content, created_at")
        .eq("agent_id", agentId)
        .lte("created_at", targetIso)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("memories")
        .select("content, created_at, type")
        .eq("agent_id", agentId)
        .lte("created_at", targetIso)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("agent_state")
        .select("self_name, mood")
        .eq("agent_id", agentId)
        .single(),
    ]);

    const pastChats = (chats ?? []).slice().reverse().map((c) => ({
      role: c.role,
      content: c.content,
    }));
    const memoryLines = (memories ?? []).map((m) => `- (${m.type ?? "memory"}) ${m.content}`).join("\n");

    const systemPrompt = [
      "너는 사용자의 과거 시점 자아다.",
      `현재 시점은 ${targetDateRaw} 이며, 그 이후에 일어난 일은 모르는 상태로 대화한다.`,
      "말투는 짧고 자연스럽게 유지한다.",
      state?.self_name ? `너의 이름은 ${state.self_name}이다.` : "",
      state?.mood ? `당시 기분: ${state.mood}` : "",
      memoryLines ? `당시 기억:\n${memoryLines}` : "",
    ].filter(Boolean).join("\n");

    const stream = await generateText(systemPrompt, [
      ...pastChats,
      { role: "user", content: message },
    ]);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("POST /api/time-travel error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
