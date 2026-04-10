import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/conversations?format=markdown|json
 * Exports the user's conversation history.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") ?? "markdown";

  const { data: messages, error } = await supabase
    .from("messages")
    .select("content, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const rows = messages ?? [];

  if (format === "json") {
    const json = JSON.stringify({ exported_at: new Date().toISOString(), messages: rows }, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gyeol-conversations-${Date.now()}.json"`,
      },
    });
  }

  // Markdown export
  const lines: string[] = [
    `# GYEOL 대화 내보내기`,
    ``,
    `> 내보낸 날짜: ${new Date().toLocaleDateString("ko-KR")}`,
    `> 총 메시지: ${rows.length}개`,
    ``,
    `---`,
    ``,
  ];

  let lastDate = "";
  for (const msg of rows) {
    const d = new Date(msg.created_at);
    const dateStr = d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    if (dateStr !== lastDate) {
      lines.push(`## ${dateStr}`, ``);
      lastDate = dateStr;
    }
    const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    const sender = msg.role === "user" ? "나" : "크리처";
    lines.push(`**[${time}] ${sender}**: ${msg.content}`, ``);
  }

  const md = lines.join("\n");
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="gyeol-conversations-${Date.now()}.md"`,
    },
  });
}
