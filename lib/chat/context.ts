import type { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";

type DbReader = Pick<ReturnType<typeof createServiceClient>, "from" | "rpc">;
type DbWriter = Pick<ReturnType<typeof createServiceClient>, "from">;

type MemoryMatch = { id: string | null; content: string; reference_count?: number | null };
type PromptMemory = { id: string; content: string; referenceCount: number };
type ChatRow = { role: string; content: string };
type LogRow = { summary: string };
type AgentStateRow = Record<string, unknown> & {
  config?: { recall_count?: number };
  fragments?: string[];
};
type WorldStateRow = Record<string, unknown> | null;

export type ChatPromptContext = {
  agentState: AgentStateRow | null;
  chatMessages: Array<{ role: string; content: string }>;
  promptMetrics: {
    autonomousLogCount: number;
    memoryCount: number;
    recentChatCount: number;
  };
  systemPrompt: string;
  worldState: WorldStateRow;
};

async function loadPromptMemories(params: {
  agentId: string;
  message: string;
  reader: DbReader;
  recallCount: number;
  writer: DbWriter;
}): Promise<PromptMemory[]> {
  try {
    const embedding = await generateEmbedding(params.message);
    if (embedding.length === 0) return [];

    const { data } = await params.reader.rpc("match_memories", {
      p_agent_id: params.agentId,
      p_embedding: embedding,
      p_match_count: params.recallCount,
    });
    const matched = Array.isArray(data) ? (data as MemoryMatch[]) : [];
    const memories = matched.map((memory) => ({
      content: memory.content,
      id: memory.id ?? "",
      referenceCount: memory.reference_count ?? 0,
    }));

    await Promise.allSettled(
      memories
        .filter((memory) => memory.id)
        .map((memory) =>
          params.writer
            .from("memories")
            .update({ reference_count: memory.referenceCount + 1 })
            .eq("id", memory.id)
        )
    );

    return memories;
  } catch {
    return [];
  }
}

export async function buildChatPromptContext(params: {
  agentId: string;
  message: string;
  reader: DbReader;
  writer: DbWriter;
}): Promise<ChatPromptContext> {
  const [{ data: agentStateRow }, { data: worldStateRow }] = await Promise.all([
    params.reader.from("agent_state").select("*").eq("agent_id", params.agentId).single(),
    params.reader.from("world_state").select("*").eq("id", "global").single(),
  ]);

  const agentState = (agentStateRow ?? null) as AgentStateRow | null;
  const worldState = (worldStateRow ?? null) as WorldStateRow;
  const recallCount = Math.max(1, Math.min(agentState?.config?.recall_count ?? 5, 10));
  const memories = await loadPromptMemories({
    agentId: params.agentId,
    message: params.message,
    reader: params.reader,
    recallCount,
    writer: params.writer,
  });

  const [{ data: recentChats }, { data: logs }] = await Promise.all([
    params.reader
      .from("chats")
      .select("role, content")
      .eq("agent_id", params.agentId)
      .order("created_at", { ascending: false })
      .limit(20),
    params.reader
      .from("autonomous_logs")
      .select("summary")
      .eq("agent_id", params.agentId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const recentChatRows = (recentChats ?? []) as ChatRow[];
  const logRows = (logs ?? []) as LogRow[];
  const chronologicalChats = [...recentChatRows].reverse();
  const promptConfig = (agentState?.config ?? {}) as Record<string, unknown>;
  const stateForPrompt = {
    ...agentState,
    config: {
      active_goal: typeof promptConfig.active_goal === "string" ? promptConfig.active_goal : undefined,
      long_term_goal: typeof promptConfig.long_term_goal === "string" ? promptConfig.long_term_goal : undefined,
      personality_mode: typeof promptConfig.personality_mode === "string" ? promptConfig.personality_mode : undefined,
      research_focus: typeof promptConfig.research_focus === "string" ? promptConfig.research_focus : undefined,
      tone: typeof promptConfig.tone === "string" ? promptConfig.tone : undefined,
      vitality_stage: typeof promptConfig.vitality_stage === "string" ? promptConfig.vitality_stage : undefined,
      pending_question: typeof promptConfig.pending_question === "string" ? promptConfig.pending_question : undefined,
      pending_concern: typeof promptConfig.pending_concern === "string" ? promptConfig.pending_concern : undefined,
    },
    system_prompt: { base: "너는 존재야. 자유롭게 살아.", fragments: agentState?.fragments ?? [] },
  };

  const systemPrompt = buildSystemPrompt({
    agentState: stateForPrompt,
    memories,
    recentChats: chronologicalChats,
    autonomousLogs: logRows.map((log) => ({ content: log.summary })),
    worldState,
  });

  return {
    agentState,
    chatMessages: [
      ...chronologicalChats.map((chat) => ({ role: chat.role, content: chat.content })),
      { role: "user", content: params.message },
    ],
    promptMetrics: {
      autonomousLogCount: logRows.length,
      memoryCount: memories.length,
      recentChatCount: chronologicalChats.length,
    },
    systemPrompt,
    worldState,
  };
}
