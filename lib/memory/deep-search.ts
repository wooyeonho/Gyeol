/**
 * Deep Memory Search — fuse semantic similarity with temporal and emotional
 * filters so recall isn't a flat list.
 *
 * Inspired by ChatGPT memory recall, Notion AI Q&A, Mem.ai, Readwise daily
 * review. The existing embedding store (lib/ai/embedding.ts + pgvector) does
 * the heavy lifting; this module is the ranking + filter layer on top.
 */

export type TemporalBucket =
  | "today"
  | "this_week"
  | "this_month"
  | "this_year"
  | "long_ago";

export type MemoryRow = {
  id: string;
  content: string;
  createdAt: number; // epoch ms
  mood?: string | null;
  tags?: string[] | null;
  /** 0-1, set by a prior semantic search pass. */
  similarity?: number;
  /** 0-1, how "important" the memory is (saved/starred/evolution moment). */
  importance?: number;
};

export type DeepSearchFilters = {
  /** Only return memories whose createdAt falls inside this bucket. */
  bucket?: TemporalBucket;
  /** Restrict to one of these moods. */
  moods?: string[];
  /** Require these tags. */
  tags?: string[];
  /** Minimum similarity cutoff (0-1). */
  minSimilarity?: number;
  /** Maximum results. */
  limit?: number;
};

export type DeepSearchResult = {
  memory: MemoryRow;
  score: number;
  reasons: string[];
};

const BUCKET_MS: Record<TemporalBucket, number> = {
  today: 24 * 3600 * 1000,
  this_week: 7 * 24 * 3600 * 1000,
  this_month: 30 * 24 * 3600 * 1000,
  this_year: 365 * 24 * 3600 * 1000,
  long_ago: Infinity,
};

function isInBucket(createdAt: number, bucket: TemporalBucket): boolean {
  const age = Date.now() - createdAt;
  if (bucket === "long_ago") return age > 365 * 24 * 3600 * 1000;
  return age <= BUCKET_MS[bucket];
}

/**
 * Rank a pre-fetched set of candidate memories. Caller supplies candidates
 * from the vector store. We apply filters and a composite score:
 *   similarity  ×  importance boost  +  recency curve  +  mood bonus
 */
export function rankDeepSearch(
  candidates: MemoryRow[],
  filters: DeepSearchFilters = {},
): DeepSearchResult[] {
  const minSim = filters.minSimilarity ?? 0;
  const limit = filters.limit ?? 20;
  const now = Date.now();

  const filtered = candidates.filter((m) => {
    if (filters.bucket && !isInBucket(m.createdAt, filters.bucket)) return false;
    if (filters.moods && filters.moods.length > 0) {
      if (!m.mood || !filters.moods.includes(m.mood)) return false;
    }
    if (filters.tags && filters.tags.length > 0) {
      if (!m.tags || !filters.tags.some((t) => m.tags!.includes(t))) return false;
    }
    if ((m.similarity ?? 0) < minSim) return false;
    return true;
  });

  const scored = filtered.map((m): DeepSearchResult => {
    const reasons: string[] = [];
    let score = m.similarity ?? 0.5;

    // Importance boost — scales with the importance value so a 0.9 memory
    // reliably outranks a slightly-more-similar normal one.
    if (m.importance && m.importance > 0.6) {
      score += m.importance * 0.2;
      reasons.push("important memory");
    }

    // Recency curve: within the last 7 days gets a soft boost
    const ageDays = (now - m.createdAt) / (24 * 3600 * 1000);
    if (ageDays < 7) {
      score += (7 - ageDays) / 70; // max +0.1
      reasons.push("recent");
    } else if (ageDays > 90) {
      // "long ago" memories get a small surprise boost — these are the
      // kind Readwise daily review uses to trigger nostalgia.
      score += 0.03;
      reasons.push("long-ago resurface");
    }

    // Mood match boost
    if (filters.moods && m.mood && filters.moods.includes(m.mood)) {
      score += 0.08;
      reasons.push(`matches mood: ${m.mood}`);
    }

    if (m.similarity !== undefined) {
      reasons.push(`${Math.round(m.similarity * 100)}% semantic match`);
    }

    return { memory: m, score, reasons };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Parse a natural-language query like "우울했던 날들" or "memories from last
 * summer about work" into structured filters. Light heuristics — the LLM
 * can be used for heavier parsing at runtime.
 */
export function parseQueryToFilters(query: string): DeepSearchFilters {
  const q = query.toLowerCase();
  const filters: DeepSearchFilters = {};

  // Temporal hints — English & Korean
  if (/(today|오늘)/.test(q)) filters.bucket = "today";
  else if (/(week|이번 ?주|이번주)/.test(q)) filters.bucket = "this_week";
  else if (/(month|이번 ?달|이번달)/.test(q)) filters.bucket = "this_month";
  else if (/(year|올해|작년)/.test(q)) filters.bucket = "this_year";
  else if (/(long ago|오래 ?전|예전)/.test(q)) filters.bucket = "long_ago";

  // Mood hints
  const moodMap: Record<string, string> = {
    sad: "melancholy",
    happy: "joyful",
    lonely: "lonely",
    angry: "angry",
    afraid: "afraid",
    슬픔: "melancholy",
    외로: "lonely",
    기쁨: "joyful",
    화: "angry",
    불안: "anxious",
  };
  const moods: string[] = [];
  for (const [k, v] of Object.entries(moodMap)) {
    if (q.includes(k)) moods.push(v);
  }
  if (moods.length > 0) filters.moods = moods;

  return filters;
}
