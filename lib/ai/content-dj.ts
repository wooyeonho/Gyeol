/**
 * Content DJ — AI-powered content curation engine
 *
 * Selects and prioritises feed items, suggestions, and discovery content
 * based on user interaction history, creature state, and time-of-day signals.
 */

export interface ContentItem {
  id: string;
  type: "tip" | "quest" | "memory" | "social" | "discovery" | "challenge";
  title: string;
  body: string;
  priority: number; // 0-1, higher = more relevant
  tags: string[];
  expiresAt?: string; // ISO date
}

interface DJContext {
  streakDays: number;
  creatureLevel: number;
  mood: string | null;
  recentInteractions: string[]; // last N interaction types
  hourOfDay: number;
  locale: string;
}

/** Time-of-day multiplier: morning = care tips, evening = reflection */
function timeWeight(hour: number, type: ContentItem["type"]): number {
  if (hour >= 6 && hour < 10) {
    // Morning: boost quests and challenges
    if (type === "quest" || type === "challenge") return 1.3;
    if (type === "memory") return 0.8;
  }
  if (hour >= 20 || hour < 2) {
    // Evening: boost memories and social
    if (type === "memory" || type === "social") return 1.3;
    if (type === "challenge") return 0.7;
  }
  return 1.0;
}

/** Streak-based boost: long streaks get discovery content */
function streakWeight(streak: number, type: ContentItem["type"]): number {
  if (streak >= 7 && type === "discovery") return 1.4;
  if (streak === 0 && type === "tip") return 1.5; // returning user gets tips
  return 1.0;
}

/** Deduplicate by suppressing types the user just interacted with */
function recencyPenalty(recentTypes: string[], type: string): number {
  const count = recentTypes.filter((t) => t === type).length;
  return Math.max(0.5, 1 - count * 0.15);
}

/**
 * Score and sort content items for a given user context.
 * Returns top `limit` items sorted by relevance.
 */
export function curate(
  items: ContentItem[],
  ctx: DJContext,
  limit = 10,
): ContentItem[] {
  const now = new Date();

  const scored = items
    .filter((item) => {
      if (item.expiresAt && new Date(item.expiresAt) < now) return false;
      return true;
    })
    .map((item) => {
      const base = item.priority;
      const tw = timeWeight(ctx.hourOfDay, item.type);
      const sw = streakWeight(ctx.streakDays, item.type);
      const rp = recencyPenalty(ctx.recentInteractions, item.type);
      const score = base * tw * sw * rp;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Generate a "DJ set" — a themed batch of content recommendations.
 * Ensures variety by limiting each type to at most `maxPerType` items.
 */
export function generateDJSet(
  items: ContentItem[],
  ctx: DJContext,
  { limit = 8, maxPerType = 3 }: { limit?: number; maxPerType?: number } = {},
): ContentItem[] {
  const ranked = curate(items, ctx, items.length);
  const result: ContentItem[] = [];
  const typeCounts: Record<string, number> = {};

  for (const item of ranked) {
    if (result.length >= limit) break;
    const count = typeCounts[item.type] ?? 0;
    if (count >= maxPerType) continue;
    typeCounts[item.type] = count + 1;
    result.push(item);
  }

  return result;
}
