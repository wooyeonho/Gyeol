import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  if (CRON_SECRET && req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const agentId = body.agent_id as string | undefined;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!agentId || !message) {
      return NextResponse.json({ error: "agent_id and message required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: agentStateRow } = await service
      .from("agent_state")
      .select("*")
      .eq("agent_id", agentId)
      .single();
    if (!agentStateRow) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const agentState = agentStateRow as Record<string, unknown>;

    const { data: worldRow } = await service.from("world_state").select("*").eq("id", "global").single();
    const worldState = worldRow as { weather?: { name?: string } } | null;

    let memories: { content?: string }[] = [];
    try {
      const embedding = await generateEmbedding(message);
      if (embedding.length > 0) {
        const { data: matched } = await service.rpc("match_memories", {
          p_agent_id: agentId,
          p_embedding: embedding,
          p_match_count: 5,
        });
        memories = Array.isArray(matched) ? matched : [];
      }
    } catch (e) {
      console.error("match_memories error", e);
    }

    const { data: recentChats } = await service
      .from("chats")
      .select("role, content")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20);
    const chats = ((recentChats ?? []).reverse()) as { role: string; content: string }[];

    const { data: autonLogs } = await service
      .from("autonomous_logs")
      .select("action_type, summary")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(3);
    const autonomousLogs = (autonLogs ?? []) as { action_type?: string; summary?: string }[];

    const systemPrompt = buildSystemPrompt({
      agentState,
      memories,
      recentChats: chats,
      autonomousLogs,
      worldState,
    });

    const messages = [
      ...chats.map((c) => ({ role: c.role, content: c.content })),
      { role: "user" as const, content: message },
    ];

    const stream = await generateText(systemPrompt, messages);
    let fullText = "";
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const s = decoder.decode(value);
      const lines = s.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ") && line.slice(6).trim() !== "[DONE]") {
          try {
            const j = JSON.parse(line.slice(6).trim()) as { choices?: { delta?: { content?: string } }[] };
            const content = j.choices?.[0]?.delta?.content;
            if (typeof content === "string") fullText += content;
          } catch {
            // ignore
          }
        }
      }
    }

    await service.from("chats").insert([
      { agent_id: agentId, role: "user", content: message },
      { agent_id: agentId, role: "assistant", content: fullText },
    ]);
    const total = ((agentState.total_messages as number) ?? 0) + 1;
    const intimacy = ((agentState.intimacy_score as number) ?? 0) + 0.5;
    const vitality = Math.min(1, ((agentState.vitality as number) ?? 1) + 0.02);
    await service
      .from("agent_state")
      .update({ total_messages: total, intimacy_score: intimacy, vitality })
      .eq("agent_id", agentId);

    return NextResponse.json({ reply: fullText || "..." });
  } catch (e) {
    console.error("Chat internal error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
