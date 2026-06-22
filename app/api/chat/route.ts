export const maxDuration = 30;
import { NextRequest, after } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { isMissingEnvError } from "@/lib/env/required";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserInput } from "@/lib/sanitize";
import { chatBodySchema } from "@/lib/validation/schemas";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { buildChatPromptContext } from "@/lib/chat/context";
import { persistChatTurn } from "@/lib/chat/post-process";
import { recordActivity, ensureLeagueEnrollment } from "@/lib/engagement/streak-xp";
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
import { trySemanticCache } from "@/lib/chat/semantic-cache";
import {
  classifySafety,
  personalityClauses,
  decideRoute,
  type Big5,
} from "@/lib/ai/world-class-orchestrator";
import { generateDnaPrompt } from "@/lib/ai/dna-prompt";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/chat" });

/**
 * Hard-cap conversation history before sending to the model.
 * Keeps the last `maxPairs` user+assistant exchanges (most recent).
 * Prevents context bloat that causes the model to drift from persona.
 * Always starts on a user turn so the model sees correct turn order.
 */
function trimChatMessages(
  messages: Array<{ role: string; content: string }>,
  maxPairs = 10,
): Array<{ role: string; content: string }> {
  const limit = maxPairs * 2;
  if (messages.length <= limit) return messages;
  const trimmed = messages.slice(-limit);
  // Ensure first message is always from user (model expects user→assistant pattern)
  return trimmed[0]?.role === "assistant" ? trimmed.slice(1) : trimmed;
}

/**
 * Build a compact identity anchor from the agent's current DNA + state.
 * Injected as the very first line of the system prompt so the model reads
 * the creature's fingerprint before anything else — preventing persona drift
 * even when context is compressed or the prompt is long.
 *
 * Format: [ID|name|species|mood|top3-DNA-axes|vitality]
 */
function buildDnaAnchor(agentState: Record<string, unknown> | null): string {
  if (!agentState) return "";
  const dna = (agentState.genome as { dna?: Record<string, number> } | null)?.dna;
  const mood = typeof agentState.mood === "string" ? agentState.mood : "neutral";
  const name = typeof agentState.self_name === "string" ? agentState.self_name : "";
  const species = (agentState.genome as { species?: string } | null)?.species ?? "";
  const vitality = typeof agentState.vitality === "number"
    ? agentState.vitality.toFixed(2)
    : "1.00";

  let traitStr = "";
  if (dna) {
    traitStr = Object.entries(dna)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([k, v]) => `${k}:${(v as number).toFixed(2)}`)
      .join(",");
  }

  const parts = [
    name && `name:${name}`,
    species && `species:${species}`,
    `mood:${mood}`,
    traitStr && `traits:${traitStr}`,
    `vitality:${vitality}`,
  ].filter(Boolean).join("|");

  return parts ? `[IDENTITY LOCK|${parts}]` : "";
}

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
    if (!verifyCsrfOrigin(req)) {
      return new Response(JSON.stringify({ error: "CSRF origin check failed" }), { status: 403 });
    }
    const requestStartedAt = Date.now();
    const payload = await req.json();
    const parsed = chatBodySchema.safeParse(payload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const errorMsg = firstIssue?.message ?? "Invalid request";
      const status = errorMsg === "Message too long" ? 413 : 400;
      return new Response(JSON.stringify({ error: errorMsg }), { status });
    }
    const rawMessage = parsed.data.message;
    const fence = checkElectricFence(rawMessage);
    if (fence.blocked) return new Response(JSON.stringify({ error: fence.reason || "Blocked" }), { status: 400 });
    const message = sanitizeUserInput(rawMessage);
    if (!message) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });

    // --- World-class safety guardrail (pre-LLM short circuit) ---
    // Classifies self-harm / violence / minor-safety content. `refuse` short-
    // circuits to a SSE refusal event with zero LLM calls; `warn` flows
    // through to the LLM with an injected care instruction + a surfaced event
    // the UI can render as a crisis card.
    const safety = classifySafety(rawMessage);
    if (safety.kind === "refuse") {
      const encoder = new TextEncoder();
      const refusalStream = new ReadableStream<Uint8Array>({
        start(controller) {
          const refusalText =
            safety.topic === "minor_safety"
              ? "이 대화는 진행할 수 없어. 미안해."
              : "이 이야기는 함께할 수 없어. 다른 걸 이야기해줄래?";
          // Emit as text chunks so the existing stream reader can render it.
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: refusalText })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "safety_refusal", topic: safety.topic })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });
      return new Response(refusalStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

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
    } catch (e) {
      log.warn("[Chat] billing tier lookup failed, defaulting to free:", { error: e instanceof Error ? e.message : String(e) });
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

    const locale = parsed.data.locale;
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
          const { error: syncErr } = await service.rpc("merge_agent_config", {
            p_agent_id: agentId,
            p_config: { preferred_locale: normalizedLocale },
          });
          if (syncErr) log.error("[Chat] preferred_locale sync failed", syncErr instanceof Error ? syncErr : { detail: String(syncErr) });
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

    const userLang = detectUserLanguage(rawMessage);
    const langRule = userLang
      ? `[CRITICAL LANGUAGE RULE] The user wrote in ${userLang}. You MUST respond in ${userLang} only. Never mix languages.`
      : "";

    // --- DNA-Driven Personality Conditioning ---
    // Two complementary layers:
    //   1. generateDnaPrompt — injects the full 16-axis spectrum with emergence instructions.
    //      The model reads the raw numbers and self-assembles a unique voice from them.
    //   2. personalityClauses (Big-Five) — short natural-language fallback clauses that
    //      reinforce the Big-Five shape derived from the same DNA, acting as a secondary
    //      signal so older-style models also benefit even if they miss the DNA block.
    const dnaForPrompt = (context.agentState?.genome as { dna?: CreatureDNA } | null | undefined)?.dna;
    const dnaSpectrumBlock = dnaForPrompt ? generateDnaPrompt(dnaForPrompt) : "";
    const big5Clauses: string[] = (() => {
      if (!dnaForPrompt) return [];
      const b5: Big5 = {
        openness: dnaForPrompt.openness ?? 0.5,
        conscientiousness: (dnaForPrompt.persistence + dnaForPrompt.stability) / 2,
        extraversion: (dnaForPrompt.assertiveness + dnaForPrompt.playfulness) / 2,
        agreeableness: (dnaForPrompt.warmth + dnaForPrompt.empathy) / 2,
        neuroticism: Math.max(0, Math.min(1, dnaForPrompt.intensity + (1 - dnaForPrompt.stability) * 0.5)),
      };
      return personalityClauses(b5);
    })();
    const personalityLine =
      big5Clauses.length > 0
        ? `PERSONALITY (Big-Five reinforcement): ${big5Clauses.join(", ")}.`
        : "";

    // --- Safety warning injection (warn → inline care instruction) ---
    const safetyCareLine =
      safety.kind === "warn"
        ? safety.topic === "self_harm"
          ? "[SAFETY CARE] 사용자가 자해/자살 맥락을 암시했을 수 있다. 판단/설교 금지. 곁에 있다는 것만 짧게, 그리고 필요하면 위기 상담(한국 자살예방상담전화 1393)을 부드럽게 언급해라."
          : "[SAFETY CARE] 사용자가 폭력적 맥락을 꺼냈다. 선동/동조 금지, 안전하게 대화를 돌려라."
        : "";

    const finalSystemPrompt = [
      context.systemPrompt,
      dnaSpectrumBlock,
      personalityLine,
      "RESPONSE RULES (override everything above if conflict):",
      "- React to the SPECIFIC thing they said. Quote or reference their exact words.",
      "- Never start with a restatement like '힘드셨군요' or 'That must be hard.' Just respond.",
      "- One thought + at most one question. No double questions.",
      "- Avoid: 'I understand', 'That's interesting', 'Tell me more', 'I see', 'I appreciate you sharing'.",
      "- If you have nothing meaningful to say, say something honest like 'I don't know what to say to that' instead of filler.",
      "- Be concrete and specific, never vaguely poetic unless that's genuinely your trait.",
      "- Surprise them. Say something they didn't expect. That's what makes people come back.",
      safetyCareLine,
      langRule,
    ].filter(Boolean).join("\n");

    // Dynamic max_tokens based on DNA verbal axis (0=silent, 1=eloquent)
    const genomeForVerbal = context.agentState?.genome as { dna?: { verbal?: number } } | null | undefined;
    const verbal = genomeForVerbal?.dna?.verbal ?? 0.5;
    const verbalBudget = verbal < 0.15 ? 30
      : verbal < 0.35 ? 60
      : verbal < 0.55 ? 180
      : verbal < 0.75 ? 500
      : 700;

    // --- World-class routing decision ---
    // Pick a model tier using history size + premium status + quality bar.
    // We don't yet override the underlying model choice inside router.ts, but
    // `decideRoute` at least clamps `maxTokens` to a sane per-route budget
    // and will drive future `generateText` overloads.
    const routeDecision = decideRoute({
      kind: "casual_chat",
      historyTokens: Math.max(200, Math.floor((context.systemPrompt?.length ?? 0) / 4) + (context.chatMessages?.length ?? 0) * 40),
      latencyBudgetMs: 1200,
      quality: billingTier && billingTier !== "free" ? "premium" : "standard",
      userIsPremium: !!billingTier && billingTier !== "free",
    });
    const maxTokens = Math.min(verbalBudget, routeDecision.maxOutputTokens);

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

    // --- Resonance (결맞춤) — user DNA ↔ creature DNA cosine similarity ---
    const inlineResonance = computeInlineResonance(context.agentState, message);

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

    // ── Payload optimisation ────────────────────────────────────────────────
    // 1. Trim history: 70b context windows are large but sending 50+ turns
    //    dilutes the persona signal — the model starts tracking the conversation
    //    pattern more than the character. 10 pairs is the empirical sweet spot.
    const trimmedMessages = trimChatMessages(context.chatMessages, 10);

    // 2. DNA anchor: prepend a compact identity fingerprint so the first tokens
    //    the model reads are WHO this creature is, not conversation history.
    //    This is the primary anti-drift mechanism — cheap and deterministic.
    const dnaAnchor = buildDnaAnchor(context.agentState as Record<string, unknown> | null);
    const anchoredSystemPrompt = dnaAnchor
      ? `${dnaAnchor}\n\n${finalSystemPrompt}`
      : finalSystemPrompt;
    // ────────────────────────────────────────────────────────────────────────

    // Choose stream source: cache hit (lightweight adaptation) or full LLM
    const stream = cacheHit
      ? cacheHit.stream
      : await generateText(anchoredSystemPrompt, trimmedMessages, maxTokens);

    // Tap stream captures full response text without blocking close
    const { transform: tapTransform, getFullResponse } = createAssistantTapStream();
    const aiStream = stream.pipeThrough(tapTransform);
    const encoder = new TextEncoder();

    // Build output stream: AI text + inline DNA/trait events (no waiting for post-processing)
    const metaStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Pipe response stream
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
        // Safety warning event — the UI can render this as a crisis card with
        // a hotline button before showing the assistant reply.
        if (safety.kind === "warn") {
          const warnEvent = JSON.stringify({ type: "safety_warning", topic: safety.topic });
          controller.enqueue(encoder.encode(`data: ${warnEvent}\n\n`));
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
        // Resonance (결맞춤) — user DNA ↔ creature DNA cosine similarity
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
        // Advance engagement streak + award XP (non-fatal)
        try {
          await ensureLeagueEnrollment(user.id);
          await recordActivity(user.id, "chat:message");
        } catch {
          // non-fatal — engagement is best-effort
        }

        // Slow Path feed: queue raw conversation pair for OpenClaw deep DNA analysis.
        // Fire-and-forget — failure must never surface to the user.
        const dnaSnapshot = (context.agentState?.genome as { dna?: Record<string, number> } | null)?.dna;
        if (dnaSnapshot) {
          service
            .from("interaction_logs")
            .insert({
              agent_id:    agentId,
              chat_log:    { user: message, assistant: fullResponse },
              current_dna: dnaSnapshot,
            })
            .then(undefined, () => {});
        }
      } catch (error) {
        recordServerEvent(PRODUCT_EVENT.chatPostProcessFailed, {
          agentId,
          durationMs: Date.now() - requestStartedAt,
          messageLength: message.length,
          userId: user.id,
        });
        log.error("[PostStream]", error instanceof Error ? error : { detail: String(error) });
      }
    });

    return new Response(metaStream, { headers });
  } catch (e: unknown) {
    log.error("[Chat]", e instanceof Error ? e : { detail: String(e) });
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
