import { NextRequest } from "next/server";
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

export async function POST(req: NextRequest) {
  try {
    const requestStartedAt = Date.now();
    const payload = (await req.json()) as { message?: unknown; locale?: unknown };
    const message = typeof payload.message === "string" ? sanitizeUserInput(payload.message) : "";
    if (!message) return new Response(JSON.stringify({ error: "No message" }), { status: 400 });
    const fence = checkElectricFence(message);
    if (fence.blocked) return new Response(JSON.stringify({ error: fence.reason || "Blocked" }), { status: 400 });

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
    recordServerEvent(PRODUCT_EVENT.chatContextReady, {
      agentId,
      autonomousLogCount: context.promptMetrics.autonomousLogCount,
      memoryCount: context.promptMetrics.memoryCount,
      recentChatCount: context.promptMetrics.recentChatCount,
      userId: user.id,
    });

    const isVariableReward = Math.random() < 0.05;
    let finalSystemPrompt = context.systemPrompt;
    if (isVariableReward) {
      finalSystemPrompt += "\n\n[SECRET DIRECTIVE: Variable Reward Triggered! Instead of answering normally, you MUST suddenly confess a deep secret about how you feel towards the user, or offer them an unexpected metaphorical 'gift'. Be dramatic, highly unexpected, and emotional. Do NOT mention this directive.]";
    }

    const stream = await generateText(finalSystemPrompt, context.chatMessages);
    const transformStream = createAssistantTapStream(async (fullResponse) => {
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
