/**
 * World-class reader / news patterns — from 10+ top reading apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.14):
 *   Apple News, Arc Search, Feedly, Readwise Reader, Pocket, Instapaper,
 *   NYTimes, Substack, Medium, Kindle.
 */

export type ReaderPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const READER_PRINCIPLES: readonly ReaderPrinciple[] = [
  { id: "editor-curation", source: "Apple News", rule: "Humans curate the top rail; algorithms own the long tail." },
  { id: "summary-card", source: "Arc Search", rule: "Each article gets a TL;DR card that reveals detail on demand." },
  { id: "rss-filter", source: "Feedly", rule: "User-defined rules filter noise before it hits the inbox." },
  { id: "highlight-tts", source: "Readwise Reader", rule: "Highlights work in TTS + text; recall flows through both modalities." },
  { id: "read-later", source: "Pocket / Instapaper", rule: "Save-for-later is one tap; queue is a physical object with a count badge." },
  { id: "reader-focus", source: "Instapaper", rule: "Reader view strips ads and chrome; typography is the product." },
  { id: "bundle-games", source: "NYTimes", rule: "Bundle games with news — retention comes from daily puzzles, not daily scoops." },
  { id: "subscription-newsletter", source: "Substack", rule: "Writers own the subscriber list; platform is a conduit, not a gatekeeper." },
  { id: "publishing", source: "Medium", rule: "Every reader is a potential publisher; tools are the same." },
  { id: "highlight-sync", source: "Kindle", rule: "Highlights sync between devices and become an external memory." },
] as const;

/* ── TL;DR extraction (first-n-sentences baseline) ──────────────────── */

/**
 * Produce an extractive TL;DR using the first `n` sentences of the text.
 * Returns trimmed sentences with the period preserved. Deterministic and
 * dependency-free so it works in tests and SSR.
 */
export function extractTldr(text: string, n = 3): string {
  if (!text.trim()) return "";
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, n);
  return sentences.join(" ").trim();
}

/* ── Reading time ───────────────────────────────────────────────────── */

/** Estimate reading time in minutes at 220 words per minute. */
export function estimateReadingMinutes(wordCount: number, wpm = 220): number {
  return Math.max(1, Math.ceil(wordCount / wpm));
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ── Highlight model ────────────────────────────────────────────────── */

export type Highlight = {
  id: string;
  text: string;
  articleId: string;
  createdAt: number;
  lastRecalled: number;
  recallCount: number;
};

/** Readwise-style daily recall queue: due if not recalled in N days. */
export function dueHighlights(
  highlights: readonly Highlight[],
  now: number,
  cooldownDays = 7,
): Highlight[] {
  const cooldown = cooldownDays * 24 * 3600 * 1000;
  return highlights.filter((h) => now - h.lastRecalled >= cooldown);
}

/** Pick `k` highlights deterministically seeded by day key. */
export function pickDailyRecall(
  highlights: readonly Highlight[],
  dayKey: string,
  k = 5,
): Highlight[] {
  const hashed = highlights
    .map((h) => ({ h, key: hash(dayKey + ":" + h.id) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, k)
    .map((x) => x.h);
  return hashed;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
