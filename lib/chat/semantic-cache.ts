/**
 * Semantic Response Cache
 *
 * Before calling the LLM, check if a semantically similar message was sent
 * recently (within 24h). If cosine similarity > threshold, return the previous
 * assistant response — drastically cutting latency for repeated patterns
 * (greetings, "how are you", daily check-ins).
 *
 * The cache piggybacks on the existing pgvector `match_memories` RPC,
 * filtering by type='conversation' and a tight time window.
 */

import type { createServiceClient } from "@/lib/supabase/service";

type DbReader = Pick<ReturnType<typeof createServiceClient>, "from" | "rpc">;

/** Similarity threshold — only cache hits above this are considered. */
const CACHE_SIMILARITY_THRESHOLD = 0.93;

/** Only consider messages from the last 24 hours. */
const CACHE_WINDOW_HOURS = 24;

type CacheMatch = {
  id: string;
  content: string;
  similarity: number;
  created_at: string;
};

/**
 * Check for a semantic cache hit. Returns the cached assistant response
 * if a very similar recent message was found, or null if no hit.
 */
export async function checkSemanticCache(params: {
  agentId: string;
  message: string;
  embedding: number[];
  reader: DbReader;
}): Promise<string | null> {
  try {
    if (params.embedding.length === 0) return null;

    // Short messages (greetings, "hi", "ㅎㅇ") benefit most from caching
    // but we allow any message length for cache lookup
    const { data } = await params.reader.rpc("match_memories", {
      p_agent_id: params.agentId,
      p_embedding: params.embedding,
      p_match_count: 3,
    });

    if (!Array.isArray(data) || data.length === 0) return null;

    const cutoff = Date.now() - CACHE_WINDOW_HOURS * 3600 * 1000;
    const matches = (data as CacheMatch[]).filter(
      (m) =>
        m.similarity >= CACHE_SIMILARITY_THRESHOLD &&
        m.created_at &&
        new Date(m.created_at).getTime() > cutoff
    );

    if (matches.length === 0) return null;

    // Found a near-duplicate recent message — fetch the assistant response that followed it
    const bestMatch = matches[0];
    const { data: followingChat } = await params.reader
      .from("chats")
      .select("content")
      .eq("agent_id", params.agentId)
      .eq("role", "assistant")
      .gt("created_at", bestMatch.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const cachedReply = (followingChat as { content?: string } | null)?.content;
    if (!cachedReply || cachedReply.length < 2) return null;

    console.log(`[SemanticCache] Hit: similarity=${bestMatch.similarity.toFixed(3)} message="${bestMatch.content.slice(0, 40)}..."`);
    return cachedReply;
  } catch (e) {
    console.error("[SemanticCache] Error:", e);
    return null;
  }
}
