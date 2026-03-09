import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { createServiceClient } from "@/lib/supabase/service";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { isMissingEnvError } from "@/lib/env/required";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";

type MemoryMatch = { id: string | null; content: string; reference_count?: number | null };
type PromptMemory = { id: string; content: string; referenceCount: number };
type ChatRow = { role: string; content: string };
type LogRow = { summary: string };
type StreamChunk = { choices?: Array<{ delta?: { content?: string } }> };
const NEGATIVE_MOOD_PATTERN = /실패|힘들|지쳤|우울|불안|망했|포기|외롭|슬퍼|무기력/i;
const POSITIVE_MEMORY_PATTERN = /성공|해냈|좋았|행복|감사|기뻤|해결|자랑|웃었/i;
const BEST_DAY_REPLAY_PATTERN = /그날|돌아가|다시|힘들|실패|우울|불안/i;

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
    const payload = (await req.json()) as { message?: unknown };
    const message = typeof payload.message === "string" ? sanitizeUserInput(payload.message) : "";
    if (!message) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });
    const fence = checkElectricFence(message);
    if (fence.blocked) return new Response(JSON.stringify({ error: fence.reason || "Blocked" }), { status: 400 });

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const allowed = await checkRateLimit(`chat:${user.id}`);
    if (!allowed) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });

    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent) return new Response(JSON.stringify({ error: "No agent" }), { status: 404 });
    const agentId = agent.id;

    const { data: agentState } = await supabase.from("agent_state").select("*").eq("agent_id", agentId).single();
    const { data: worldState } = await supabase.from("world_state").select("*").eq("id", "global").single();

    // Memory search - use existing match_memories RPC (p_agent_id, p_embedding, p_match_count)
    let memories: PromptMemory[] = [];
    try {
      const embedding = await generateEmbedding(message);
      if (embedding.length > 0) {
        const { data } = await supabase.rpc("match_memories", {
          p_agent_id: agentId,
          p_embedding: embedding,
          p_match_count: agentState?.config?.recall_count || 5,
        });
        const matched = Array.isArray(data) ? (data as MemoryMatch[]) : [];
        memories = matched.map((m) => ({
          content: m.content,
          id: m.id ?? "",
          referenceCount: m.reference_count ?? 0,
        }));
        const db = createServiceClient();
        for (const m of memories) {
          if (m.id) {
            await db
              .from("memories")
              .update({ reference_count: m.referenceCount + 1 })
              .eq("id", m.id);
          }
        }
      }
    } catch {}

    const { data: recentChats } = await supabase.from("chats").select("role, content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(20);
    const { data: logs } = await supabase.from("autonomous_logs").select("summary").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(3);
    const recentChatRows = (recentChats || []) as ChatRow[];
    const logRows = (logs || []) as LogRow[];
    const chronologicalChats = [...recentChatRows].reverse();

    let reframeMemory: string | null = null;
    if (NEGATIVE_MOOD_PATTERN.test(message)) {
      try {
        const { data: memoryRows } = await supabase
          .from("memories")
          .select("content")
          .eq("agent_id", agentId)
          .eq("type", "conversation")
          .order("created_at", { ascending: false })
          .limit(120);
        const picked = (memoryRows ?? [])
          .map((m) => String((m as { content?: string }).content ?? ""))
          .find((line) => POSITIVE_MEMORY_PATTERN.test(line));
        if (picked) reframeMemory = picked.slice(0, 220);
      } catch {}
    }

    const stateForPrompt = {
      ...agentState,
      system_prompt: { base: "너는 존재야. 자유롭게 살아.", fragments: agentState?.fragments || [] },
    };

    const systemPrompt = buildSystemPrompt({
      agentState: stateForPrompt,
      memories,
      recentChats: chronologicalChats,
      autonomousLogs: logRows.map((l) => ({ content: l.summary })),
      worldState,
    });
    const shouldReplayBestDay = Boolean(reframeMemory && BEST_DAY_REPLAY_PATTERN.test(message));
    const finalSystemPrompt = reframeMemory
      ? `${systemPrompt}\n\n사용자가 힘들어할 때는 과거의 긍정 기억을 부드럽게 상기시켜줘: "${reframeMemory}".${shouldReplayBestDay ? "\n가능하면 '잠깐 그날로 돌아가보자' 같은 톤으로 말해줘." : ""}`
      : systemPrompt;

    const chatMessages = [
      ...chronologicalChats.map((c) => ({ role: c.role, content: c.content })),
      { role: "user", content: message },
    ];

    const stream = await generateText(finalSystemPrompt, chatMessages);

    // Collect full response while streaming
    let fullResponse = "";
    const decoder = new TextDecoder();
    let sseBuffer = "";

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        sseBuffer += decoder.decode(chunk, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6)) as StreamChunk;
              const content = json.choices?.[0]?.delta?.content || "";
              fullResponse += content;
            } catch {}
          }
        }
        controller.enqueue(chunk);
      },
      async flush() {
        // Post-stream processing
        try {
          sseBuffer += decoder.decode();
          for (const line of sseBuffer.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6)) as StreamChunk;
                const content = json.choices?.[0]?.delta?.content || "";
                fullResponse += content;
              } catch {}
            }
          }

          const db = createServiceClient();

          await db.from("chats").insert([
            { agent_id: agentId, role: "user", content: message },
            { agent_id: agentId, role: "assistant", content: fullResponse },
          ]);

          const emb = await generateEmbedding(message);
          if (emb.length > 0) {
            await db.from("memories").insert({
              agent_id: agentId, type: "conversation", content: message, embedding: emb,
            });
          }

          const totalMessages = (agentState?.total_messages || 0) + 1;
          const newVitality = Math.min(1.0, (agentState?.vitality || 1) + 0.02);
          await db.from("agent_state").update({
            total_messages: totalMessages,
            intimacy_score: (agentState?.intimacy_score || 0) + 0.5,
            vitality: newVitality,
          }).eq("agent_id", agentId);

          // Personality evolution every 10 messages
          if (totalMessages % 10 === 0) {
            try { const { analyzePersonality } = await import("@/lib/evolution/personality"); await analyzePersonality(agentId); } catch (e) { console.error("[Evolution]", e); }
          }
          // Gen level check
          try { const { checkEvolution } = await import("@/lib/evolution/gen-level"); await checkEvolution(agentId); } catch (e) { console.error("[GenLevel]", e); }
          // Hidden emotions
          try { const { processHiddenEmotions } = await import("@/lib/personality/deception"); await processHiddenEmotions(agentId, message, fullResponse); } catch (e) { console.error("[Emotions]", e); }
          // Secrets
          try { const { processSecrets } = await import("@/lib/personality/secrets"); await processSecrets(agentId, fullResponse); } catch (e) { console.error("[Secrets]", e); }
          if (reframeMemory) {
            try {
              await db.from("autonomous_logs").insert({
                agent_id: agentId,
                action_type: "memory_reframe",
                summary: reframeMemory.slice(0, 120),
              });
            } catch {}
          }
          if (shouldReplayBestDay && reframeMemory) {
            try {
              const currentVisual = (agentState?.visual as Record<string, unknown> | null) ?? {};
              const replayVisual = {
                ...currentVisual,
                glow: Math.min(100, Number(currentVisual.glow ?? 50) + 10),
                animation: "breathe-slow",
              };
              await db.from("agent_state").update({ visual: replayVisual }).eq("agent_id", agentId);
              await db.from("artifacts").insert({
                agent_id: agentId,
                type: "memory_replay",
                title: "가장 좋았던 하루",
                content: `잠깐 그날로 돌아가볼까?\n\n${reframeMemory}`,
                expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
              });
              await db.from("autonomous_logs").insert({
                agent_id: agentId,
                action_type: "best_day_replay",
                summary: reframeMemory.slice(0, 120),
              });
            } catch (e) {
              console.error("[BestDayReplay]", e);
            }
          }
          // Periodic quote/pet extraction from conversation corpus
          if (totalMessages % 15 === 0) {
            try { const { updateBestQuotes } = await import("@/lib/intelligence/best-quotes"); await updateBestQuotes(agentId); } catch (e) { console.error("[BestQuotes]", e); }
          }
          if (totalMessages % 20 === 0) {
            try { const { processPets } = await import("@/lib/personality/pets"); await processPets(agentId); } catch (e) { console.error("[Pets]", e); }
          }
        } catch (e) { console.error("[PostStream]", e); }
      },
    });

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

    return new Response(stream.pipeThrough(transformStream), { headers });
  } catch (e: unknown) {
    console.error("[Chat]", e);
    if (isMissingEnvError(e)) {
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
