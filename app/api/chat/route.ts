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

export async function POST(req: NextRequest) {
  try {
    const requestStartedAt = Date.now();
    const payload = (await req.json()) as { message?: unknown; locale?: unknown };
    const rawMessage = typeof payload.message === "string" ? payload.message : "";
    if (!rawMessage.trim()) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });
    const fence = checkElectricFence(rawMessage);
    if (fence.blocked) return new Response(JSON.stringify({ error: fence.reason || "Blocked" }), { status: 400 });
    const message = sanitizeUserInput(rawMessage);
    if (!message) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const allowed = await checkRateLimit(`chat:${user.id}`);
    if (!allowed) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });

    const service = createServiceClient();
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
    const normalizedLocale = normalizeLocale(locale);
    if (normalizedLocale && context.agentState) {
      const cfg = (context.agentState.config ?? {}) as Record<string, unknown>;
      if (!cfg.preferred_locale || cfg.preferred_locale !== normalizedLocale) {
        cfg.preferred_locale = normalizedLocale;
        after(async () => {
          await service
            .from("agent_state")
            .update({ config: cfg })
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

    const finalSystemPrompt = [
      context.systemPrompt,
      "Response quality rules:",
      "- Answer the user's actual point first.",
      "- Stay natural, specific, and emotionally grounded.",
      "- Avoid generic poetic filler, forced metaphors, or theatrical confessions unless the user clearly wants that tone.",
      "- Prefer one clear follow-up question at most.",
      "- If you are unsure, be concrete and honest instead of vague.",
    ].join("\n");

    // Dynamic max_tokens based on DNA verbal axis (0=silent, 1=eloquent)
    const genome = context.agentState?.genome as { dna?: { verbal?: number } } | null | undefined;
    const verbal = genome?.dna?.verbal ?? 0.5;
    const maxTokens = verbal < 0.15 ? 30
      : verbal < 0.35 ? 60
      : verbal < 0.55 ? 180
      : verbal < 0.75 ? 500
      : 700;

    const stream = await generateText(finalSystemPrompt, context.chatMessages, maxTokens);
    let postProcessResult: { changedAxes?: string[]; newTraits?: { id: string; name: { ko: string; en: string } }[] } = {};
    const transformStream = createAssistantTapStream(async (fullResponse) => {
      recordServerEvent(PRODUCT_EVENT.chatStreamCompleted, {
        agentId,
        durationMs: Date.now() - requestStartedAt,
        replyLength: fullResponse.length,
        userId: user.id,
      });
      try {
        const result = await persistChatTurn({
          agentId,
          agentState: context.agentState,
          durationMs: Date.now() - requestStartedAt,
          message,
          reply: fullResponse,
          writer: service,
        });
        postProcessResult = { changedAxes: result.changedAxes, newTraits: result.newTraits };
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

    // Pipe AI stream through tap, then append dna_shift metadata event
    const aiStream = stream.pipeThrough(transformStream);
    const encoder = new TextEncoder();
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
        // Append dna_shift event after the main stream completes
        if (postProcessResult.changedAxes && postProcessResult.changedAxes.length > 0) {
          const dnaEvent = JSON.stringify({ type: "dna_shift", axes: postProcessResult.changedAxes });
          controller.enqueue(encoder.encode(`data: ${dnaEvent}\n\n`));
        }
        // Append trait_emerged event if new traits expressed
        if (postProcessResult.newTraits && postProcessResult.newTraits.length > 0) {
          const traitEvent = JSON.stringify({ type: "trait_emerged", traits: postProcessResult.newTraits });
          controller.enqueue(encoder.encode(`data: ${traitEvent}\n\n`));
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
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
