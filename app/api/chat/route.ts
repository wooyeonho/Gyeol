export const maxDuration = 30;
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
import { getExpressedTraits } from "@/lib/genome/traits";
import { trySemanticCache } from "@/lib/chat/semantic-cache";

/** Detect the dominant language of user input to enforce response language matching. */
function detectUserLanguage(text: string): string | null {
  if (!text || text.length < 2) return null;
  // Count characters in major script ranges
  const korean = (text.match(/[\uAC00-\uD7AF\u3131-\u318E]/g) || []).length;
  const japanese = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  const chinese = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  // Latin includes accented characters (French é, German ü, Spanish ñ, etc.)
  const latin = (text.match(/[a-zA-Z\u00C0-\u00FF]/g) || []).length;
  const total = korean + japanese + chinese + latin;
  if (total === 0) return null;
  if (korean / total > 0.3) return "Korean (한국어)";
  if (japanese / total > 0.3) return "Japanese (日本語)";
  // Chinese characters can overlap with Japanese kanji; only flag if no kana present
  if (chinese / total > 0.3 && japanese === 0) return "Chinese (中文)";
  // Spanish detection: require ñ or inverted punctuation (¿¡) as markers
  if (latin > 0 && /[ñÑ¿¡]/.test(text)) return "Spanish (Español)";
  if (latin / total > 0.5) return "English";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const requestStartedAt = Date.now();
    const payload = (await req.json()) as { message?: unknown; locale?: unknown };
    const rawMessage = typeof payload.message === "string" ? payload.message : "";
    if (!rawMessage.trim()) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });
    // Prevent DOS via extremely long messages (8K chars ≈ 2K tokens)
    if (rawMessage.length > 8000) return new Response(JSON.stringify({ error: "Message too long" }), { status: 413 });
    const fence = checkElectricFence(rawMessage);
    if (fence.blocked) return new Response(JSON.stringify({ error: fence.reason || "Blocked" }), { status: 400 });
    const message = sanitizeUserInput(rawMessage);
    if (!message) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const service = createServiceClient();

    // Resolve billing tier so paid users get higher rate limits (pro=40, premium=80 req/min)
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
    } catch (e) {
      console.warn("[Chat] billing tier lookup failed, defaulting to free:", e instanceof Error ? e.message : e);
    }
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

    // Auto-sync detected locale to agent config so autonomous crons
    // (heartbeat, dream, social, etc.) generate in the user's language.
    // Uses atomic JSON merge to avoid overwriting config written by persistChatTurn.
    const normalizedLocale = normalizeLocale(locale);
    if (normalizedLocale && context.agentState) {
      const cfg = (context.agentState.config ?? {}) as Record<string, unknown>;
      if (!cfg.preferred_locale || cfg.preferred_locale !== normalizedLocale) {
        after(async () => {
          // Re-read latest config from DB to avoid overwriting usage_profile, goals, trait notifications
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
            .then(({ error: syncErr }: { error: { message: string } | null }) => {
              if (syncErr) console.error("[Chat] preferred_locale sync failed", syncErr);
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

    // Detect the user's language from their latest message to enforce matching
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

    // Dynamic max_tokens based on DNA verbal axis (0=silent, 1=eloquent)
    const genomeForVerbal = context.agentState?.genome as { dna?: { verbal?: number } } | null | undefined;
    const verbal = genomeForVerbal?.dna?.verbal ?? 0.5;
    const maxTokens = verbal < 0.15 ? 30
      : verbal < 0.35 ? 60
      : verbal < 0.55 ? 180
      : verbal < 0.75 ? 500
      : 700;

    // --- P2A: Semantic cache check (reuses embedding from context to avoid redundant API call) ---
    const cacheHit = await trySemanticCache({
      agentId,
      message,
      reader: supabase,
      systemPrompt: finalSystemPrompt,
      maxTokens,
      precomputedEmbedding: context.embedding,
    });

    // --- P3A: Synchronous DNA mutation (pure function, no DB) ---
    const genome = context.agentState?.genome as { dna?: CreatureDNA; species?: string; archetype?: string; element?: string } | null;
    let dnaShiftAxes: string[] = [];
    let newTraits: { id: string; name: { ko: string; en: string } }[] = [];
    if (genome?.dna) {
      const { dna: evolvedDNA, changedAxes } = applySoftMutation(genome.dna, message);
      dnaShiftAxes = changedAxes;
      if (changedAxes.length > 0) {
        const prevTraits = getExpressedTraits(genome.dna);
        const nextTraits = getExpressedTraits(evolvedDNA);
        const prevIds = new Set(prevTraits.map((t) => t.id));
        newTraits = nextTraits
          .filter((t) => !prevIds.has(t.id))
          .map((t) => ({ id: t.id, name: t.name }));
      }
    }

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

    // Choose stream source: cache hit (lightweight adaptation) or full LLM
    const stream = cacheHit
      ? cacheHit.stream
      : await generateText(finalSystemPrompt, context.chatMessages, maxTokens);

    // Tap stream captures full response text without blocking close
    const { transform: tapTransform, getFullResponse } = createAssistantTapStream();
    const aiStream = stream.pipeThrough(tapTransform);
    const encoder = new TextEncoder();

    // Build output stream: AI text + inline DNA/trait events (no waiting for post-processing)
    const metaStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = aiStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }
        // P3A: DNA shift + trait events sent inline (synchronous, no DB wait)
        if (dnaShiftAxes.length > 0) {
          const dnaEvent = JSON.stringify({ type: "dna_shift", axes: dnaShiftAxes });
          controller.enqueue(encoder.encode(`data: ${dnaEvent}\n\n`));
        }
        if (newTraits.length > 0) {
          const traitEvent = JSON.stringify({ type: "trait_emerged", traits: newTraits });
          controller.enqueue(encoder.encode(`data: ${traitEvent}\n\n`));
        }
        // P5A: Memory moment event (if context had a strong match)
        if (context.memoryMoment) {
          const mmEvent = JSON.stringify({
            type: "memory_moment",
            memory: context.memoryMoment.content,
            age_days: context.memoryMoment.ageDays,
            similarity: context.memoryMoment.similarity,
          });
          controller.enqueue(encoder.encode(`data: ${mmEvent}\n\n`));
        }
        controller.close();
      },
    });

    // P1A: Move ALL post-processing into after() — stream closes immediately
    after(async () => {
      const fullResponse = getFullResponse();
      recordServerEvent(PRODUCT_EVENT.chatStreamCompleted, {
        agentId,
        durationMs: Date.now() - requestStartedAt,
        replyLength: fullResponse.length,
        userId: user.id,
      });
      try {
        await persistChatTurn({
          agentId,
          agentState: context.agentState,
          durationMs: Date.now() - requestStartedAt,
          message,
          reply: fullResponse,
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

    return new Response(metaStream, { headers });
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
