import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai/router";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { isMissingEnvError } from "@/lib/env/required";

type TimeTravelPayload = {
  target_date?: unknown;
  message?: unknown;
};

type HistoricalChat = {
  role: string;
  content: string;
  created_at?: string;
};

type HistoricalMemory = {
  content: string;
  type?: string | null;
  created_at?: string;
};

type HistoricalLog = {
  summary: string;
  created_at?: string;
};

function getAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  const sameOrigin = origin === req.nextUrl.origin;
  if (sameOrigin) return origin;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    return new URL(origin).origin === new URL(appUrl).origin ? origin : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as TimeTravelPayload;
    const targetDate = typeof payload.target_date === "string" ? payload.target_date.trim() : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";

    if (!targetDate || !message) {
      return new Response(JSON.stringify({ error: "Missing target date or message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cutoff = new Date(`${targetDate}T23:59:59.999Z`);
    if (Number.isNaN(cutoff.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid target date" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (cutoff.getTime() > Date.now()) {
      return new Response(JSON.stringify({ error: "Target date must be in the past" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fence = checkElectricFence(message);
    if (fence.blocked) {
      return new Response(JSON.stringify({ error: fence.reason || "Blocked" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent) {
      return new Response(JSON.stringify({ error: "No agent" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cutoffIso = cutoff.toISOString();
    const [{ data: agentState }, { data: chats }, { data: memories }, { data: logs }] = await Promise.all([
      supabase.from("agent_state").select("self_name").eq("agent_id", agent.id).single(),
      supabase
        .from("chats")
        .select("role, content, created_at")
        .eq("agent_id", agent.id)
        .lte("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("memories")
        .select("content, type, created_at")
        .eq("agent_id", agent.id)
        .lte("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("autonomous_logs")
        .select("summary, created_at")
        .eq("agent_id", agent.id)
        .lte("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    const historicalChats = ((chats ?? []) as HistoricalChat[]).reverse();
    const historicalMemories = (memories ?? []) as HistoricalMemory[];
    const historicalLogs = (logs ?? []) as HistoricalLog[];
    const selfName =
      typeof agentState?.self_name === "string" && agentState.self_name.trim().length > 0
        ? agentState.self_name.trim()
        : "결";

    const memoryLines =
      historicalMemories.length > 0
        ? historicalMemories.map((memory) => `- ${memory.type ? `[${memory.type}] ` : ""}${memory.content}`).join("\n")
        : "- 아직 뚜렷한 기억이 많지 않다.";

    const logLines =
      historicalLogs.length > 0
        ? historicalLogs.map((log) => `- ${log.summary}`).join("\n")
        : "- 특별히 기록된 자율 활동은 없다.";

    const systemPrompt = [
      "너는 사용자의 AI 동반자다.",
      `지금은 ${targetDate} 시점의 ${selfName}로서 대화한다.`,
      "오직 주어진 과거 대화, 기억, 활동 기록만 알고 있다.",
      "그 날짜 이후의 사건, 감정, 관계 변화는 아직 모른다.",
      "사용자가 미래를 묻거나 이후 사건을 언급하면 '아직 모르는 일'이라고 자연스럽게 답한다.",
      "답변은 한국어로, 짧고 생생하게, 대화답게 이어간다.",
      "너무 단정적으로 꾸며내지 말고, 주어진 기록에서 추론 가능한 범위 안에서만 말한다.",
      "",
      "[과거 기억]",
      memoryLines,
      "",
      "[과거 자율 활동]",
      logLines,
    ].join("\n");

    const stream = await generateText(systemPrompt, [
      ...historicalChats.map((chat) => ({ role: chat.role, content: chat.content })),
      { role: "user", content: message },
    ]);

    const allowedOrigin = getAllowedOrigin(req);
    const headers: HeadersInit = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };

    if (allowedOrigin) {
      headers["Access-Control-Allow-Origin"] = allowedOrigin;
      headers.Vary = "Origin";
    }

    return new Response(stream, { headers });
  } catch (error: unknown) {
    console.error("[TimeTravel]", error);
    if (isMissingEnvError(error)) {
      return new Response(
        JSON.stringify({ error: "Service unavailable: missing server configuration", code: "MISSING_ENV" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
