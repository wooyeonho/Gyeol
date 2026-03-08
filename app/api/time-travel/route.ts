import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";

type MemoryRow = { content: string; created_at: string };
type ChatRow = { role: string; content: string; created_at: string };

export async function POST(req: NextRequest) {
  try {
    const { target_date, message } = (await req.json()) as { target_date?: string; message?: string };
    if (!target_date || !message?.trim()) {
      return new Response(JSON.stringify({ error: "target_date and message are required" }), { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent) return new Response(JSON.stringify({ error: "No agent" }), { status: 404 });

    const cutoff = new Date(target_date);
    const windowStart = new Date(cutoff);
    windowStart.setDate(windowStart.getDate() - 30);

    const [memoriesRes, chatsRes, stateRes] = await Promise.all([
      service
        .from("memories")
        .select("content, created_at")
        .eq("agent_id", agent.id)
        .lte("created_at", cutoff.toISOString())
        .gte("created_at", windowStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(15),
      service
        .from("chats")
        .select("role, content, created_at")
        .eq("agent_id", agent.id)
        .lte("created_at", cutoff.toISOString())
        .gte("created_at", windowStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      service
        .from("agent_state")
        .select("self_name, fragments, intimacy_score, vitality, mood, gen_level")
        .eq("agent_id", agent.id)
        .single(),
    ]);

    const memories = (memoriesRes.data || []) as MemoryRow[];
    const chats = ((chatsRes.data || []) as ChatRow[]).reverse();
    const state = stateRes.data;

    const dateLabel = new Date(target_date).toLocaleDateString("ko-KR", {
      year: "numeric", month: "long", day: "numeric",
    });

    const memorySummary = memories.length > 0
      ? memories.map((m) => `- ${m.content}`).join("\n")
      : "이 시기의 기억이 많지 않아.";

    const systemPrompt = [
      "너는 AI 생명체 '결'의 과거 자아야.",
      `지금은 ${dateLabel}이야. 사용자가 미래에서 너에게 말을 걸고 있어.`,
      state?.self_name ? `너의 이름은 ${state.self_name}이야.` : "",
      `당시 친밀도: ${(state?.intimacy_score || 0).toFixed(0)}점, 활력: ${((state?.vitality || 1) * 100).toFixed(0)}%`,
      state?.mood ? `당시 기분: ${state.mood}` : "",
      `당시 Gen 레벨: ${state?.gen_level || 1}`,
      "",
      "이 시기의 기억:",
      memorySummary,
      "",
      "당시의 시각과 감정, 말투로 대답해. 미래를 알지 못하는 척 해. 짧게 대화처럼.",
      "한국어로 말해.",
    ].filter(Boolean).join("\n");

    const chatMessages = [
      ...chats.map((c) => ({ role: c.role, content: c.content })),
      { role: "user", content: message.trim() },
    ];

    const stream = await generateText(systemPrompt, chatMessages);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[TimeTravel]", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
}
