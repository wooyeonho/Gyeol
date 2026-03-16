import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ messages: [] });

    const { data } = await service
      .from("chats")
      .select("role, content, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(12);

    const messages = ((data ?? []) as Array<{ role?: string; content?: string; created_at?: string }> )
      .reverse()
      .map((row, index) => ({
        id: `history-${row.created_at ?? index}-${index}`,
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content ?? "",
      }))
      .filter((row) => row.content.trim().length > 0);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/chat/history error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
