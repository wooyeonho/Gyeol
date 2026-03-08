import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { analyzePersonality } from "@/lib/evolution/personality";
import { checkEvolution } from "@/lib/evolution/gen-level";
import { processHiddenEmotions } from "@/lib/personality/deception";
import { incrementReferenceCounts } from "@/lib/memory/physics";
import { mightNeedReframe, getReframeMemories, getBestDayMemory } from "@/lib/personality/reframe";
import { updateUserModel } from "@/lib/intelligence/digital-twin";
import { detectAndSaveSharedLanguage } from "@/lib/intelligence/shared-lang";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = typeof body?.message === "string" ? body.message : "";
    const message = sanitizeUserInput(raw);
    if (!message) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!(await checkRateLimit(user.id))) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = createServiceClient();
    const { data: agents } = await service
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    let agentId = agents?.[0]?.id;
    if (!agentId) {
      const { data: newAgent } = await service.from("agents").insert({ user_id: user.id }).select("id").single();
      agentId = newAgent?.id;
      if (agentId) {
        await service.from("agent_state").insert({
          agent_id: agentId,
          total_messages: 0,
          intimacy_score: 0,
          vitality: 1,
          progress: 0,
          gen_level: 1,
        });
      }
    }
    if (!agentId) {
      return new Response(JSON.stringify({ error: "Agent init failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: agentStateRow } = await service
      .from("agent_state")
      .select("*")
      .eq("agent_id", agentId)
      .single();
    const agentState = (agentStateRow ?? {}) as Record<string, unknown>;

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
    const chats = (recentChats ?? []).reverse() as { role: string; content: string }[];

    const { data: autonLogs } = await service
      .from("autonomous_logs")
      .select("action_type, summary")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(3);
    const autonomousLogs = (autonLogs ?? []) as { action_type?: string; summary?: string }[];

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: imaginationRows } = await service
      .from("memories")
      .select("content")
      .eq("agent_id", agentId)
      .eq("type", "imagination")
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(3);
    const imaginationMemories = (imaginationRows ?? []) as { content?: string }[];

    let reframeMemories: { content?: string }[] = [];
    let bestDayMemory: { content?: string } | null = null;
    if (mightNeedReframe(message)) {
      reframeMemories = await getReframeMemories(agentId);
    }
    bestDayMemory = await getBestDayMemory(agentId);

    const { data: feedbackRows } = await service
      .from("memories")
      .select("content")
      .eq("agent_id", agentId)
      .eq("type", "feedback")
      .order("created_at", { ascending: false })
      .limit(5);
    const feedbackMemories = (feedbackRows ?? []) as { content?: string }[];

    const bestQuotes = (agentState.best_quotes as { quote: string; date?: string; context?: string }[] | undefined) ?? [];
    const systemPrompt = buildSystemPrompt({
      agentState,
      memories,
      recentChats: chats,
      autonomousLogs,
      worldState,
      imaginationMemories,
      reframeMemories,
      bestDayMemory,
      bestQuotes,
      feedbackMemories,
    });

    const messages = [
      ...chats.map((c) => ({ role: c.role, content: c.content })),
      { role: "user" as const, content: message },
    ];

    const stream = await generateText(systemPrompt, messages);
    let fullText = "";
    const encoder = new TextEncoder();
    let sseParseErrors = 0;
    const SSE_ERROR_LOG_THRESHOLD = 5;

    function extractContentFromSSE(chunk: Uint8Array): string {
      const s = new TextDecoder().decode(chunk);
      if (!s.includes("data:")) return s;
      const lines = s.split("\n");
      let out = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
            const content = j.choices?.[0]?.delta?.content;
            if (typeof content === "string") out += content;
          } catch {
            sseParseErrors++;
            if (sseParseErrors >= SSE_ERROR_LOG_THRESHOLD) {
              console.error(`SSE parse errors: ${sseParseErrors} for agent ${agentId}`, { sample: data.slice(0, 100) });
            }
          }
        }
      }
      return out;
    }

    const transformed = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = extractContentFromSSE(chunk);
        if (text) {
          fullText += text;
          controller.enqueue(encoder.encode(text));
        }
      },
      async flush() {
        try {
          await service.from("chats").insert([
            { agent_id: agentId, role: "user", content: message },
            { agent_id: agentId, role: "assistant", content: fullText },
          ]);
          const total = ((agentState.total_messages as number) ?? 0) + 1;
          const intimacy = ((agentState.intimacy_score as number) ?? 0) + 0.5;
          const vitality = Math.min(1, ((agentState.vitality as number) ?? 1) + 0.02);
          const config = (agentState.config as Record<string, unknown>) ?? {};
          const pq = typeof config.pending_question === "string" ? config.pending_question : "";
          const hadRelationshipQuestion = pq.includes("What am I to you");
          const hadFeedbackQuestion = /hurt|feedback/.test(pq);
          const nextConfig =
            hadRelationshipQuestion ? { ...config, asked_relationship: true, pending_question: null }
            : hadFeedbackQuestion ? { ...config, pending_question: null }
            : config;
          await service
            .from("agent_state")
            .update({
              total_messages: total,
              intimacy_score: intimacy,
              vitality,
              config: nextConfig,
            })
            .eq("agent_id", agentId);
          if (memories.length > 0) {
            const emb = await generateEmbedding(message);
            if (emb.length > 0) {
              const memoryType = hadFeedbackQuestion ? "feedback" : "conversation";
              await service.from("memories").insert({
                agent_id: agentId,
                type: memoryType,
                content: message,
                embedding: emb,
              });
            }
            const ids = memories.map((m) => (m as { id?: string }).id).filter((id): id is string => Boolean(id));
            try {
              await incrementReferenceCounts(agentId, ids);
            } catch (e) {
              console.error("incrementReferenceCounts error", e);
            }
          }
          if (total % 10 === 0) {
            try { await analyzePersonality(agentId); } catch (e) { console.error("analyzePersonality error", e); }
          }
          if (total % 50 === 0) {
            try { await updateUserModel(agentId); } catch (e) { console.error("updateUserModel error", e); }
          }
          if (total % 20 === 0 && message.length > 5 && fullText.length > 5) {
            try { await detectAndSaveSharedLanguage(agentId, message, fullText); } catch (e) { console.error("detectAndSaveSharedLanguage error", e); }
          }
          try { await checkEvolution(agentId); } catch (e) { console.error("checkEvolution error", e); }
          try { await processHiddenEmotions(agentId, message, fullText); } catch (e) { console.error("processHiddenEmotions error", e); }
        } catch (e) {
          console.error("Post-stream DB update error", e);
        }
      },
    });

    const piped = stream.pipeThrough(transformed);

    return new Response(piped, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("Chat API error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
