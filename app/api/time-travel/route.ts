import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { isMissingEnvError } from "@/lib/env/required";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { getLanguageName } from "@/lib/i18n/config";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkRateLimit(`time-travel:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    const targetDateRaw = typeof body?.target_date === "string" ? body.target_date : "";
    const message = typeof body?.message === "string" ? sanitizeUserInput(body.message) : "";
    if (!targetDateRaw || !message) {
      return NextResponse.json({ error: "target_date and message required" }, { status: 400 });
    }

    const targetDate = new Date(targetDateRaw);
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Invalid target_date" }, { status: 400 });
    }

    const fence = checkElectricFence(message);
    if (fence.blocked) return NextResponse.json({ error: fence.reason || "Blocked" }, { status: 400 });
    const locale = resolveGenerationLocale({
      acceptLanguage: req.headers.get("accept-language"),
      cookieHeader: req.headers.get("cookie"),
    });

    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const service = createServiceClient();
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23, 59, 59, 999);
    const cutoffIso = targetEnd.toISOString();

    const { data: chats } = await service
      .from("chats")
      .select("role, content, created_at")
      .eq("agent_id", agent.id)
      .lte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(18);

    const { data: memories } = await service
      .from("memories")
      .select("content, type, created_at")
      .eq("agent_id", agent.id)
      .lte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(8);

    const formattedMemories = (memories ?? [])
      .map((m) => `- [${m.type ?? "memory"}] ${m.content}`)
      .join("\n");
    const timelineChats = [...(chats ?? [])].reverse().map((c) => ({ role: c.role, content: c.content }));

    const systemPrompt = [
      "너는 사용자의 과거 시점 자아를 시뮬레이션하는 조언자다.",
      `기준 날짜: ${targetDateRaw}`,
      "규칙:",
      "1) 미래 사실을 단정하지 않는다.",
      "2) 해당 시점의 감정/맥락으로 답한다.",
      `3) ${getLanguageName(locale)}로 짧고 명확하게 답한다.`,
      formattedMemories ? `기억 요약:\n${formattedMemories}` : "기억 요약: (없음)",
    ].join("\n");

    const messages = [...timelineChats, { role: "user", content: message }];
    const stream = await generateText(systemPrompt, messages);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("time-travel POST", e);
    if (isMissingEnvError(e)) {
      return NextResponse.json(
        { error: "Service unavailable: missing server configuration", code: "MISSING_ENV" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
