import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { readSseAssistantText } from "@/lib/ai/sse-parser";
import { getApiKeyIdentifier, verifyV1ApiKey } from "@/lib/api/v1-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!(await verifyV1ApiKey(request, "v1:agent:chat"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const allowed = await checkRateLimit(`v1-chat:${getApiKeyIdentifier(request)}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const agentId = typeof body?.agent_id === "string" ? body.agent_id : "";
    const message = typeof body?.message === "string" ? sanitizeUserInput(body.message) : "";
    if (!agentId || !message) {
      return NextResponse.json({ error: "agent_id and message required" }, { status: 400 });
    }
    const fence = checkElectricFence(message);
    if (fence.blocked) return NextResponse.json({ error: fence.reason || "Blocked" }, { status: 400 });

    const service = createServiceClient();
    const { data: agentStateRow } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
    if (!agentStateRow) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const agentState = agentStateRow as Record<string, unknown>;

    const { data: worldRow } = await service.from("world_state").select("*").eq("id", "global").single();
    const worldState = worldRow as { weather?: { name?: string } } | null;

    let memories: { content?: string }[] = [];
    const recallCount = typeof (agentState.config as Record<string, unknown>)?.recall_count === "number"
      ? (agentState.config as Record<string, number>).recall_count
      : 5;
    try {
      const embedding = await generateEmbedding(message);
      if (embedding.length > 0) {
        const { data: matched } = await service.rpc("match_memories", {
          p_agent_id: agentId,
          p_embedding: embedding,
          p_match_count: Math.max(1, Math.min(recallCount, 10)),
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
    const fullText = await readSseAssistantText(stream);

    await service.from("chats").insert([
      { agent_id: agentId, role: "user", content: message },
      { agent_id: agentId, role: "assistant", content: fullText },
    ]);
    const total = ((agentState.total_messages as number) ?? 0) + 1;
    const intimacy = ((agentState.intimacy_score as number) ?? 0) + 0.5;
    const vitality = Math.min(1, ((agentState.vitality as number) ?? 1) + 0.02);
    await service.from("agent_state").update({ total_messages: total, intimacy_score: intimacy, vitality }).eq("agent_id", agentId);

    return NextResponse.json({ reply: fullText || "..." });
  } catch (e) {
    console.error("v1/agent/chat POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
