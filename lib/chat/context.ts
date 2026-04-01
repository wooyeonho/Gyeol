import type { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import type { UserPreferences } from "@/lib/creature/preference-memory";
import type { FeatureBehaviorProfile } from "@/lib/ai/system-prompt";

type DbReader = Pick<ReturnType<typeof createServiceClient>, "from" | "rpc">;
type DbWriter = Pick<ReturnType<typeof createServiceClient>, "from" | "rpc">;

type MemoryMatch = { id: string | null; content: string; reference_count?: number | null; similarity?: number | null; created_at?: string | null };
type PromptMemory = { id: string; content: string; referenceCount: number };
type ChatRow = { role: string; content: string };
type LogRow = { summary: string };
type AgentStateRow = Record<string, unknown> & {
  config?: { recall_count?: number };
  fragments?: string[];
};
type WorldStateRow = Record<string, unknown> | null;

export type MemoryMoment = { content: string; ageDays: number };

export type ChatPromptContext = {
  agentState: AgentStateRow | null;
  chatMessages: Array<{ role: string; content: string }>;
  /** Pre-computed message embedding — reusable for semantic cache lookup. */
  messageEmbedding: number[];
  promptMetrics: {
    autonomousLogCount: number;
    memoryCount: number;
    recentChatCount: number;
  };
  systemPrompt: string;
  worldState: WorldStateRow;
  /** Old high-similarity memory for "memory moment" UX. */
  memoryMoment: MemoryMoment | null;
};

async function loadPromptMemories(params: {
  agentId: string;
  embedding: number[];
  reader: DbReader;
  recallCount: number;
  writer: DbWriter;
}): Promise<{ memories: PromptMemory[]; memoryMoment: MemoryMoment | null }> {
  try {
    if (params.embedding.length === 0) return { memories: [], memoryMoment: null };

    const { data } = await params.reader.rpc("match_memories", {
      p_agent_id: params.agentId,
      p_embedding: params.embedding,
      p_match_count: params.recallCount,
    });
    const matched = Array.isArray(data) ? (data as MemoryMatch[]) : [];
    const memories = matched.map((memory) => ({
      content: memory.content,
      id: memory.id ?? "",
      referenceCount: memory.reference_count ?? 0,
    }));

    // ── P1E: Batch reference count update (single query instead of N+1) ──
    const idsToUpdate = memories.filter((m) => m.id).map((m) => m.id);
    if (idsToUpdate.length > 0) {
      try {
        // Try batch RPC first, fall back to individual updates
        const { error: rpcError } = await params.writer.rpc("batch_increment_reference_count", {
          p_ids: idsToUpdate,
        });
        if (rpcError) {
          // Fallback: individual updates (legacy path)
          await Promise.allSettled(
            idsToUpdate.map((id) =>
              params.writer
                .from("memories")
                .update({ reference_count: (memories.find((m) => m.id === id)?.referenceCount ?? 0) + 1 })
                .eq("id", id)
            )
          );
        }
      } catch {
        // Silent fallback — reference counts are non-critical
      }
    }

    // ── P5A: Detect "memory moment" — old memory recalled with high similarity ──
    let memoryMoment: MemoryMoment | null = null;
    const MEMORY_MOMENT_THRESHOLD = 0.92;
    const MEMORY_MOMENT_MIN_AGE_DAYS = 7;
    for (const m of matched) {
      if (
        m.similarity != null &&
        m.similarity >= MEMORY_MOMENT_THRESHOLD &&
        m.created_at
      ) {
        const ageDays = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000);
        if (ageDays >= MEMORY_MOMENT_MIN_AGE_DAYS) {
          memoryMoment = { content: m.content, ageDays };
          break;
        }
      }
    }

    return { memories, memoryMoment };
  } catch {
    return { memories: [], memoryMoment: null };
  }
}

export async function buildChatPromptContext(params: {
  agentId: string;
  locale?: string;
  message: string;
  reader: DbReader;
  writer: DbWriter;
}): Promise<ChatPromptContext> {
  // ── P1B: Fully parallelized context building ──
  // All 5 queries run concurrently: agent_state, world_state, embedding, chats, logs
  const [
    { data: agentStateRow },
    { data: worldStateRow },
    embedding,
    { data: recentChats },
    { data: logs },
  ] = await Promise.all([
    params.reader.from("agent_state").select("*").eq("agent_id", params.agentId).single(),
    params.reader.from("world_state").select("*").eq("id", "global").single(),
    generateEmbedding(params.message),
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

  const agentState = (agentStateRow ?? null) as AgentStateRow | null;
  const worldState = (worldStateRow ?? null) as WorldStateRow;
  const recallCount = Math.max(1, Math.min(agentState?.config?.recall_count ?? 5, 10));

  // Memory search uses the pre-computed embedding (no second network call)
  const { memories, memoryMoment } = await loadPromptMemories({
    agentId: params.agentId,
    embedding,
    reader: params.reader,
    recallCount,
    writer: params.writer,
  });

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
      user_preferences: promptConfig.user_preferences as UserPreferences | undefined,
      simple_mode_enabled: promptConfig.simple_mode_enabled === true ? true : undefined,
      feature_behavior_profile: promptConfig.feature_behavior_profile as FeatureBehaviorProfile | undefined,
    },
    system_prompt: { base: undefined, fragments: agentState?.fragments ?? [] },
  };

  const systemPrompt = buildSystemPrompt({
    agentState: stateForPrompt,
    locale: params.locale,
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
    messageEmbedding: embedding,
    promptMetrics: {
      autonomousLogCount: logRows.length,
      memoryCount: memories.length,
      recentChatCount: chronologicalChats.length,
    },
    systemPrompt,
    worldState,
    memoryMoment,
  };
}
