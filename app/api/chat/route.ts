import { NextRequest, after } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { isMissingEnvError } from "@/lib/env/required";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { buildChatPromptContext } from "@/lib/chat/context";
import { persistChatTurn } from "@/lib/chat/post-process";
import { createAssistantTapStream } from "@/lib/chat/stream";
import { getAllowedChatOrigin } from "@/lib/chat/origin";
import { PRODUCT_EVENT, recordServerEvent } from "@/lib/analytics/events";
import { normalizeLocale } from "@/lib/i18n/config";
import { applySoftMutation, type CreatureDNA } from "@/lib/genome/dna";
import {
  computeResonance,
  createInitialUserDNA,
  resonanceTopOverlap,
  updateUserDNA,
  type UserDNA,
} from "@/lib/genome/user-dna";
import { getExpressedTraits } from "@/lib/genome/traits";
import { checkSemanticCache } from "@/lib/chat/semantic-cache";

/** Detect the dominant language of user input to enforce response language matching. */
function detectUserLanguage(text: string): string | null {
  if (!text || text.length < 2) return null;
  const korean = (text.match(/[\uAC00-\uD7AF\u3131-\u318E]/g) || []).length;
  const japanese = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  const chinese = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  const latin = (text.match(/[a-zA-Z\u00C0-\u00FF]/g) || []).length;
  const total = korean + japanese + chinese + latin;
  if (total === 0) return null;
  if (korean / total > 0.3) return "Korean (한국어)";
  if (japanese / total > 0.3) return "Japanese (日本語)";
  if (chinese / total > 0.3 && japanese === 0) return "Chinese (中文)";
  if (latin > 0 && /[ñÑ¿¡]/.test(text)) return "Spanish (Español)";
  if (latin / total > 0.5) return "English";
  return null;
}

/**
 * Compute DNA mutation synchronously (pure function, no DB) so we can
 * inline the dna_shift / trait_emerged events before closing the stream.
 */
function computeInlineDnaShift(
  agentState: Record<string, unknown> | null,
  message: string,
): { changedAxes: string[]; newTraits: { id: string; name: { ko: string; en: string } }[] } {
  const genome = agentState?.genome as { dna?: CreatureDNA } | null;
  if (!genome?.dna) return { changedAxes: [], newTraits: [] };
  const { dna: evolvedDNA, changedAxes } = applySoftMutation(genome.dna, message);
  if (changedAxes.length === 0) return { changedAxes: [], newTraits: [] };
  const prevTraits = getExpressedTraits(genome.dna);
  const nextTraits = getExpressedTraits(evolvedDNA);
  const prevIds = new Set(prevTraits.map((t) => t.id));
  const newTraits = nextTraits
    .filter((t) => !prevIds.has(t.id))
    .map((t) => ({ id: t.id, name: t.name }));
  return { changedAxes, newTraits };
}

/**
 * Compute the post-turn Resonance Score (결맞춤) inline — no DB wait.
 * Mirrors the user-DNA update performed by post-process so the score
 * reflects the just-sent message.
 */
function computeInlineResonance(
  agentState: Record<string, unknown> | null,
  message: string,
): {
  score: number;
  prevScore: number;
  delta: number;
  topOverlap: { axis: string; closeness: number }[];
} | null {
  const genome = agentState?.genome as { dna?: CreatureDNA } | null;
  if (!genome?.dna) return null;
  const config = (agentState?.config as Record<string, unknown> | null) ?? {};
  const prevUserDNA = (config.user_dna as UserDNA | undefined) ?? createInitialUserDNA();
  const { dna: nextUserDNA } = updateUserDNA(prevUserDNA, message);
  const prevScore = computeResonance(prevUserDNA, genome.dna);
  const score = computeResonance(nextUserDNA, genome.dna);
  const overlap = resonanceTopOverlap(nextUserDNA, genome.dna, 3).map((o) => ({
    axis: o.axis,
    closeness: Math.round(o.closeness * 1000) / 1000,
  }));
  return {
    score,
    prevScore,
    delta: Math.round((score - prevScore) * 10) / 10,
    topOverlap: overlap,
  };
}

export async function POST(req: NextRequest) {
  try {
    const requestStartedAt = Date.now();
    const payload = (await req.json()) as { message?: unknown; locale?: unknown };
    const rawMessage = typeof payload.message === "string" ? payload.message : "";
    if (!rawMessage.trim()) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });
    if (rawMessage.length > 8000) return new Response(JSON.stringify({ error: "Message too long" }), { status: 413 });
    const fence = checkElectricFence(rawMessage);
    if (fence.blocked) return new Response(JSON.stringify({ error: fence.reason || "Blocked" }), { status: 400 });
    const message = sanitizeUserInput(rawMessage);
    if (!message) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const service = createServiceClient();

    let billingTier: string | null = null;
    try {
      const { data: sub } = await service
        .from("user_subscriptions")
        .select("plan_tier")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      billingTier = (sub as { plan_tier?: string } | null)?.plan_tier ?? null;
    } catch { /* default to free tier on error */ }
    const allowed = await checkRateLimit(`chat:${user.id}`, billingTier);
    if (!allowed) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });

    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return new Response(JSON.stringify({ error: "No agent" }), { status: 404 });

    recordServerEvent(PRODUCT_EVENT.chatRequestReceived, {
      agentId,
      messageLength: message.length,
      userId: user.id,
    });

    const locale = typeof payload.locale === "string" ? payload.locale : undefined;
    const context = await buildChatPromptContext({
      agentId,
      locale,
      message,
      reader: supabase,
      writer: service,
    });

    // Auto-sync locale in background
    const normalizedLocale = normalizeLocale(locale);
    if (normalizedLocale && context.agentState) {
      const cfg = (context.agentState.config ?? {}) as Record<string, unknown>;
      if (!cfg.preferred_locale || cfg.preferred_locale !== normalizedLocale) {
        after(async () => {
          const { data: freshRow } = await service
            .from("agent_state")
            .select("config")
            .eq("agent_id", agentId)
            .maybeSingle();
          const freshConfig = (freshRow as { config?: Record<string, unknown> } | null)?.config ?? {};
          await service
            .from("agent_state")
            .update({ config: { ...freshConfig, preferred_locale: normalizedLocale } })
            .eq("agent_id", agentId)
            .then(({ error }) => {
              if (error) console.error("[Chat] preferred_locale sync failed", error);
            });
        });
      }
    }

    recordServerEvent(PRODUCT_EVENT.chatContextReady, {
      agentId,
      autonomousLogCount: context.promptMetrics.autonomousLogCount,
      memoryCount: context.promptMetrics.memoryCount,
      recentChatCount: context.promptMetrics.recentChatCount,
      userId: user.id,
    });

    const userLang = detectUserLanguage(payload.message as string);
    const langRule = userLang
      ? `[CRITICAL LANGUAGE RULE] The user wrote in ${userLang}. You MUST respond in ${userLang} only. Never mix languages.`
      : "";

    const finalSystemPrompt = [
      context.systemPrompt,
      "RESPONSE RULES (override everything above if conflict):",
      "- React to the SPECIFIC thing they said. Quote or reference their exact words.",
      "- Never start with a restatement like '힘드셨군요' or 'That must be hard.' Just respond.",
      "- One thought + at most one question. No double questions.",
      "- Avoid: 'I understand', 'That's interesting', 'Tell me more', 'I see', 'I appreciate you sharing'.",
      "- If you have nothing meaningful to say, say something honest like 'I don't know what to say to that' instead of filler.",
      "- Be concrete and specific, never vaguely poetic unless that's genuinely your trait.",
      "- Surprise them. Say something they didn't expect. That's what makes people come back.",
      langRule,
    ].filter(Boolean).join("\n");

    const genome = context.agentState?.genome as { dna?: { verbal?: number } } | null | undefined;
    const verbal = genome?.dna?.verbal ?? 0.5;
    const maxTokens = verbal < 0.15 ? 30
      : verbal < 0.35 ? 60
      : verbal < 0.55 ? 180
      : verbal < 0.75 ? 500
      : 700;

    // ── P2A: Semantic Cache — check for near-duplicate messages ──
    const cachedResponse = await checkSemanticCache({
      agentId,
      message,
      embedding: context.messageEmbedding,
      reader: service,
    });

    // ── P3A: Compute DNA mutation synchronously (pure, no IO) ──
    const inlineDna = computeInlineDnaShift(context.agentState, message);

    // ── Resonance (결맞춤) — user DNA ↔ creature DNA cosine similarity ──
    const inlineResonance = computeInlineResonance(context.agentState, message);

    // ── P5A: Memory moment — old memory recalled with high similarity ──
    const memoryMoment = context.memoryMoment;

    let responseStream: ReadableStream;

    if (cachedResponse) {
      // Cache hit: return cached response as a single-chunk stream
      console.log("[AI] Semantic cache hit");
      recordServerEvent(PRODUCT_EVENT.chatStreamCompleted, {
        agentId,
        durationMs: Date.now() - requestStartedAt,
        replyLength: cachedResponse.length,
        userId: user.id,
        cacheHit: true,
      });
      const encoder = new TextEncoder();
      responseStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: cachedResponse } }] })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      // Still persist the turn in background
      after(async () => {
        try {
          await persistChatTurn({
            agentId,
            agentState: context.agentState,
            durationMs: Date.now() - requestStartedAt,
            message,
            reply: cachedResponse,
            writer: service,
          });
        } catch (error) {
          console.error("[PostStream:cache]", error);
        }
      });
    } else {
      // Normal LLM path
      const stream = await generateText(finalSystemPrompt, context.chatMessages, maxTokens);
      let capturedResponse = "";

      const transformStream = createAssistantTapStream((fullResponse) => {
        capturedResponse = fullResponse;
        recordServerEvent(PRODUCT_EVENT.chatStreamCompleted, {
          agentId,
          durationMs: Date.now() - requestStartedAt,
          replyLength: fullResponse.length,
          userId: user.id,
        });
      });

      responseStream = stream.pipeThrough(transformStream);

      // ── P1A: Defer ALL heavy post-processing to after() ──
      after(async () => {
        try {
          await persistChatTurn({
            agentId,
            agentState: context.agentState,
            durationMs: Date.now() - requestStartedAt,
            message,
            reply: capturedResponse,
            writer: service,
          });
        } catch (error) {
          recordServerEvent(PRODUCT_EVENT.chatPostProcessFailed, {
            agentId,
            durationMs: Date.now() - requestStartedAt,
            messageLength: message.length,
            userId: user.id,
          });
          console.error("[PostStream]", error);
        }
      });
    }

    // ── Build final stream with inline metadata events ──
    const allowedOrigin = getAllowedChatOrigin(req.headers.get("origin"), req.nextUrl.origin);
    const headers: HeadersInit = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };
    if (allowedOrigin) {
      headers["Access-Control-Allow-Origin"] = allowedOrigin;
      headers.Vary = "Origin";
    }

    const encoder = new TextEncoder();
    const metaStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Pipe response stream
        const reader = responseStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }

        // ── P5A: Memory moment event (old high-similarity memory recalled) ──
        if (memoryMoment) {
          const memoryEvent = JSON.stringify({
            type: "memory_moment",
            content: memoryMoment.content,
            age_days: memoryMoment.ageDays,
          });
          controller.enqueue(encoder.encode(`data: ${memoryEvent}\n\n`));
        }

        // ── P3A: Inline DNA shift — computed synchronously, no waiting for DB ──
        if (inlineDna.changedAxes.length > 0) {
          const dnaEvent = JSON.stringify({ type: "dna_shift", axes: inlineDna.changedAxes });
          controller.enqueue(encoder.encode(`data: ${dnaEvent}\n\n`));
        }
        if (inlineDna.newTraits.length > 0) {
          const traitEvent = JSON.stringify({ type: "trait_emerged", traits: inlineDna.newTraits });
          controller.enqueue(encoder.encode(`data: ${traitEvent}\n\n`));
        }

        // ── Resonance event — always emit so the client can track '결맞춤' over time ──
        if (inlineResonance) {
          const resonanceEvent = JSON.stringify({
            type: "resonance",
            score: inlineResonance.score,
            delta: inlineResonance.delta,
            top_overlap: inlineResonance.topOverlap,
          });
          controller.enqueue(encoder.encode(`data: ${resonanceEvent}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(metaStream, { headers });
  } catch (e: unknown) {
    console.error("[Chat]", e);
    if (isMissingEnvError(e)) {
      return new Response(
        JSON.stringify({ error: "Service unavailable: missing server configuration", code: "MISSING_ENV" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
