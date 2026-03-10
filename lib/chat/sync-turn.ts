import type { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/ai/router";
import { readSseAssistantText } from "@/lib/ai/sse-parser";
import { buildChatPromptContext } from "@/lib/chat/context";
import { persistChatTurn } from "@/lib/chat/post-process";

type DbClient = Pick<ReturnType<typeof createServiceClient>, "from" | "rpc">;

export async function runSynchronousChatTurn(params: {
  agentId: string;
  message: string;
  service: DbClient;
}) {
  const startedAt = Date.now();
  const context = await buildChatPromptContext({
    agentId: params.agentId,
    message: params.message,
    reader: params.service,
    writer: params.service,
  });

  if (!context.agentState) {
    return null;
  }

  const stream = await generateText(context.systemPrompt, context.chatMessages);
  const reply = await readSseAssistantText(stream);

  await persistChatTurn({
    agentId: params.agentId,
    agentState: context.agentState,
    durationMs: Date.now() - startedAt,
    message: params.message,
    reply,
    writer: params.service,
  });

  return {
    promptMetrics: context.promptMetrics,
    reply,
  };
}
