/**
 * Memory Citations — Claude/Perplexity-style provenance for AI replies.
 *
 * When the creature responds, every memory it drew on is attached as a
 * citation. The user can tap a citation to see exactly what the AI
 * remembered. This turns Gyeol from a "black-box that claims to remember"
 * into a transparent memory partner you can audit.
 *
 * Design goals:
 *   - Zero-cost when no citations: the type is additive on top of existing
 *     chat messages.
 *   - Stable IDs so the UI can anchor tooltips without layout shift.
 *   - Support both verbatim quotes and paraphrased recall (citation `mode`).
 */

export type CitationMode = "verbatim" | "paraphrased" | "semantic_match";

export type MemoryCitation = {
  /** Unique id so the UI can key tooltips. */
  id: string;
  /** Backing memory record id in the DB. */
  memoryId: string;
  /** Short human label: "memory from 3 days ago" etc. */
  label: string;
  /** Raw excerpt, possibly truncated. Null for semantic matches. */
  snippet: string | null;
  /** When the memory was originally formed. */
  formedAt: number; // epoch ms
  /** Mode of use — did the AI quote directly or just recall the vibe? */
  mode: CitationMode;
  /** Similarity score 0-1 if semantic. */
  similarity?: number;
  /** Which span of the reply (character range) cites this memory. */
  span?: [number, number];
};

export type CitedResponse = {
  text: string;
  citations: MemoryCitation[];
};

/**
 * Build a citation from a memory record + how it was used.
 * Callers pass in whatever shape their memory rows have — we just extract
 * the minimal surface we care about.
 */
export function buildCitation(params: {
  memoryId: string;
  content: string | null;
  formedAt: number | string | Date;
  mode?: CitationMode;
  similarity?: number;
  span?: [number, number];
}): MemoryCitation {
  const formedAt =
    typeof params.formedAt === "number"
      ? params.formedAt
      : new Date(params.formedAt).getTime();
  const snippet = truncate(params.content, 160);
  return {
    id: `cite_${params.memoryId}_${Math.floor(formedAt / 1000)}`,
    memoryId: params.memoryId,
    label: formatRelativeLabel(formedAt),
    snippet,
    formedAt,
    mode: params.mode ?? "paraphrased",
    similarity: params.similarity,
    span: params.span,
  };
}

function truncate(text: string | null, max: number): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function formatRelativeLabel(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  const wk = 7 * day;
  const mo = 30 * day;
  const yr = 365 * day;
  if (diff < min) return "방금 전 기억";
  if (diff < hr) return `${Math.floor(diff / min)}분 전 기억`;
  if (diff < day) return `${Math.floor(diff / hr)}시간 전 기억`;
  if (diff < wk) return `${Math.floor(diff / day)}일 전 기억`;
  if (diff < mo) return `${Math.floor(diff / wk)}주 전 기억`;
  if (diff < yr) return `${Math.floor(diff / mo)}개월 전 기억`;
  return `${Math.floor(diff / yr)}년 전 기억`;
}

/**
 * Inject inline citation markers into a reply. Each memory is assigned an
 * integer and markers like [1], [2] are appended near the most likely
 * anchor span (or, if no span info, at the end of the first paragraph).
 *
 * The UI renders these markers as clickable chips.
 */
export function injectCitationMarkers(
  reply: string,
  citations: MemoryCitation[],
): string {
  if (citations.length === 0) return reply;
  // Assign numbers
  const numbered = citations.map((c, i) => ({ ...c, number: i + 1 }));
  // Simple strategy: append footnote-style markers to the last sentence of
  // the first paragraph. Better span-based placement is possible but
  // requires more aligned data from the AI router.
  const paragraphs = reply.split(/\n\n+/);
  if (paragraphs.length === 0) return reply;
  const markers = numbered.map((c) => `[${c.number}]`).join(" ");
  paragraphs[0] = paragraphs[0].trimEnd() + " " + markers;
  return paragraphs.join("\n\n");
}

/**
 * Rank a list of candidate memories by their similarity score and freshness.
 * Used by the chat context builder to pick which memories get cited.
 */
export function rankCitations(
  candidates: Array<{ memoryId: string; similarity: number; formedAt: number }>,
  limit = 3,
): Array<{ memoryId: string; similarity: number; formedAt: number }> {
  const now = Date.now();
  return candidates
    .map((c) => {
      const ageDays = (now - c.formedAt) / (24 * 3600 * 1000);
      // Fresh memories get a small boost; very fresh (< 1 day) dominates.
      const freshnessBoost = Math.max(0, 1 - ageDays / 90) * 0.15;
      return { ...c, _score: c.similarity + freshnessBoost };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...c }) => {
      void _score;
      return c;
    });
}
