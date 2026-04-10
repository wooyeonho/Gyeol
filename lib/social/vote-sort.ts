/**
 * Community voting sort algorithms (Reddit-style).
 *
 * Provides hot-ranking, new, and top sorting for social feed posts.
 * The hot score combines upvotes with a logarithmic age penalty so that
 * recent posts with moderate engagement outrank old posts with high totals.
 */

export interface ScoredPost {
  id: string;
  upvotes: number;
  createdAt: Date;
  /** Pre-computed hot score (populated by calculateHotScore). */
  hotScore?: number;
  /** Allow arbitrary extra fields so callers can attach their own data. */
  [key: string]: unknown;
}

/* ── Hot ranking ── */

/**
 * Calculate a "hot" score for a post.
 *
 * Formula:  score = upvotes - gravity * log2(1 + age_hours)
 *
 * - Fresh posts start near their upvote count.
 * - The logarithmic penalty grows slowly, so a well-upvoted older post
 *   can still outrank a brand-new post with fewer votes.
 * - Gravity defaults to 1.8 (similar to Hacker News / Reddit-style decay).
 */
export function calculateHotScore(
  upvotes: number,
  createdAt: Date,
  now: Date = new Date(),
  gravity: number = 1.8,
): number {
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  const ageHours = ageMs / 3_600_000;
  const penalty = gravity * Math.log2(1 + ageHours);
  return upvotes - penalty;
}

/* ── Sort helpers ── */

/**
 * Sort posts by hot score (highest first).
 * Mutates `hotScore` on each post and returns a new sorted array.
 */
export function sortByHot(posts: ScoredPost[], now: Date = new Date()): ScoredPost[] {
  return posts
    .map((post) => ({
      ...post,
      hotScore: calculateHotScore(post.upvotes, post.createdAt, now),
    }))
    .sort((a, b) => (b.hotScore ?? 0) - (a.hotScore ?? 0));
}

/**
 * Sort posts by creation date, newest first.
 */
export function sortByNew(posts: ScoredPost[]): ScoredPost[] {
  return [...posts].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

/**
 * Sort posts by upvote count (highest first) within a time period.
 *
 * Only posts created within the given period are included in the result.
 */
export function sortByTop(
  posts: ScoredPost[],
  period: "day" | "week" | "month",
  now: Date = new Date(),
): ScoredPost[] {
  const cutoff = periodCutoff(period, now);
  return posts
    .filter((post) => post.createdAt.getTime() >= cutoff.getTime())
    .sort((a, b) => b.upvotes - a.upvotes);
}

/* ── Internal helpers ── */

function periodCutoff(period: "day" | "week" | "month", now: Date): Date {
  const d = new Date(now);
  switch (period) {
    case "day":
      d.setDate(d.getDate() - 1);
      break;
    case "week":
      d.setDate(d.getDate() - 7);
      break;
    case "month":
      d.setMonth(d.getMonth() - 1);
      break;
  }
  return d;
}
