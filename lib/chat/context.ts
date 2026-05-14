import type { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { generateEmbedding } from "@/lib/ai/embedding";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import type { UserPreferences } from "@/lib/creature/preference-memory";
import type { FeatureBehaviorProfile } from "@/lib/ai/system-prompt";
import {
  selectMemoriesForContext,
  type MemoryCandidate,
} from "@/lib/ai/world-class-orchestrator";

type DbReader = Pick<ReturnType<typeof createServiceClient>, "from" | "rpc">;
type DbWriter = Pick<ReturnType<typeof createServiceClient>, "from" | "rpc">;

type MemoryMatch = { id: string | null; content: string; reference_count?: number | null; similarity?: number; created_at?: string };
type PromptMemory = { id: string; content: string; referenceCount: number };
type ChatRow = { role: string; content: string };
type LogRow = { summary: string };
type AgentStateRow = Record<string, unknown> & {
  config?: { recall_count?: number };
  fragments?: string[];
};
type WorldStateRow = Record<string, unknown> | null;

/** P5A: Memory moment — a strongly matching old memory that triggers a recall animation */
export type MemoryMoment = {
  content: string;
  ageDays: number;
  similarity: number;
};

export type ChatPromptContext = {
  agentState: AgentStateRow | null;
  chatMessages: Array<{ role: string; content: string }>;
  /** Pre-computed message embedding — reused by semantic cache to avoid redundant API call */
  embedding: number[];
  /** P5A: If a strongly matching old memory was found, surface it for recall UX */
  memoryMoment?: MemoryMoment;
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
  embeddingPromise: Promise<number[]>;
  reader: DbReader;
  recallCount: number;
  writer: DbWriter;
}): Promise<{ memories: PromptMemory[]; memoryMoment?: MemoryMoment }> {
  try {
    // OPT-A: Reuse pre-started embedding promise instead of starting fresh
    const embedding = await params.embeddingPromise;
    if (embedding.length === 0) return { memories: [] };

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

    // OPT-B: Fire-and-forget reference count update — never block the hot path
    const ids = memories.filter((m) => m.id).map((m) => m.id);
    if (ids.length > 0) {
      void Promise.resolve(params.writer.rpc("batch_increment_reference_count", { p_ids: ids })).catch(() => {
        // Fallback: individual updates if RPC not deployed yet (still fire-and-forget)
        void Promise.allSettled(
          memories
            .filter((memory) => memory.id)
            .map((memory) =>
              params.writer
                .from("memories")
                .update({ reference_count: memory.referenceCount + 1 })
                .eq("id", memory.id)
            )
        );
      });
    }

    // P5A: Detect memory moment — similarity > 0.95 and older than 7 days
    let memoryMoment: MemoryMoment | undefined;
    const now = Date.now();
    for (const raw of matched) {
      const sim = raw.similarity ?? 0;
      const createdAt = raw.created_at ? new Date(raw.created_at).getTime() : now;
      const ageDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
      if (sim >= 0.95 && ageDays >= 7) {
        memoryMoment = { content: raw.content, ageDays, similarity: sim };
        break;
      }
    }

    return { memories, memoryMoment };
  } catch (e) {
    logger.error("[Context] Memory loading failed", { error: e instanceof Error ? e.message : e });
    return { memories: [] };
  }
}

export async function buildChatPromptContext(params: {
  agentId: string;
  locale?: string;
  message: string;
  reader: DbReader;
  writer: DbWriter;
}): Promise<ChatPromptContext> {
  // OPT-A: Start embedding generation immediately (parallel with all DB fetches).
  // Previously: waited for agentState → then started embedding (~300ms saved).
  const embeddingPromise = generateEmbedding(params.message);

  // P1B: Parallelize ALL 4 DB queries at once
  const [{ data: agentStateRow }, { data: worldStateRow }, { data: recentChats }, { data: logs }] = await Promise.all([
    params.reader.from("agent_state").select("*").eq("agent_id", params.agentId).single(),
    params.reader.from("world_state").select("*").eq("id", "global").single(),
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
      .limit(5),
  ]);

  const agentState = (agentStateRow ?? null) as AgentStateRow | null;
  const worldState = (worldStateRow ?? null) as WorldStateRow;
  const recallCount = Math.max(1, Math.min(agentState?.config?.recall_count ?? 5, 10));

  // Await the embedding so we can share it with semantic cache (avoids double API call)
  const resolvedEmbedding = await embeddingPromise;

  // Memory loading: embedding was already started, just await the RPC result now
  const { memories: rawMemories, memoryMoment } = await loadPromptMemories({
    agentId: params.agentId,
    embeddingPromise: Promise.resolve(resolvedEmbedding),
    reader: params.reader,
    recallCount,
    writer: params.writer,
  });

  // Use orchestrator's selectMemoriesForContext for smarter memory ranking
  // when we have enough memories to benefit from priority scoring.
  let memories: PromptMemory[];
  if (rawMemories.length > 3) {
    const candidates: MemoryCandidate[] = rawMemories.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: Date.now(), // approximate — exact timestamp unavailable here
      similarity: 0.7, // base similarity (already pre-filtered by match_memories)
      emotionalWeight: 0.5,
      linkedToMilestone: m.referenceCount > 3, // frequently referenced = milestone-linked
      tokenCount: Math.ceil(m.content.length / 4),
    }));
    // Token budget: ~800 tokens for memory context injection
    const ranked = selectMemoriesForContext(candidates, 800);
    const rankedIds = new Set(ranked.map((r) => r.id));
    // Preserve original PromptMemory shape, ordered by orchestrator score
    memories = ranked
      .map((r) => rawMemories.find((m) => m.id === r.id))
      .filter((m): m is PromptMemory => m !== undefined);
    // Append any that didn't fit the budget at the end (preserves all data)
    for (const m of rawMemories) {
      if (!rankedIds.has(m.id)) memories.push(m);
    }
  } else {
    memories = rawMemories;
  }

  const recentChatRows = (recentChats ?? []) as ChatRow[];
  const logRows = (logs ?? []) as LogRow[];
  const allChats = [...recentChatRows].reverse();

  // P8A: Chat history compression — keep last 7 messages verbatim,
  // compress older messages into a brief summary to save ~500 tokens/request.
  const VERBATIM_COUNT = 7;
  let chronologicalChats: ChatRow[];
  if (allChats.length > VERBATIM_COUNT) {
    const older = allChats.slice(0, allChats.length - VERBATIM_COUNT);
    const recent = allChats.slice(-VERBATIM_COUNT);
    const topics = older
      .filter((c) => c.role === "user")
      .map((c) => c.content.slice(0, 60))
      .slice(-3);
    const summary = topics.length > 0
      ? `[Earlier conversation covered: ${topics.join("; ")}]`
      : "[Earlier conversation omitted for brevity]";
    chronologicalChats = [{ role: "system", content: summary }, ...recent];
  } else {
    chronologicalChats = allChats;
  }
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
    gen_level: typeof agentState?.gen_level === "number" ? agentState.gen_level : 1,
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
    embedding: resolvedEmbedding,
    memoryMoment,
    promptMetrics: {
      autonomousLogCount: logRows.length,
      memoryCount: memories.length,
      recentChatCount: chronologicalChats.length,
    },
    systemPrompt,
    worldState,
  };
}
