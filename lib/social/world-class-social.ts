/**
 * World-class social patterns — synthesized from 12+ top social apps.
 *
 * Source apps analyzed (see WORLD_CLASS_APPS_RESEARCH.md §4½.1):
 *   Instagram, TikTok, Threads, X (Twitter), BeReal, Mastodon, Bluesky,
 *   LinkedIn, Snapchat, Lemon8, Pinterest, Clubhouse.
 *
 * This module codifies the *behavioral* patterns that make social surfaces
 * feel alive: feed gravity, story layers, reply-first ergonomics, daily
 * prompts, federation hints, and custom feed recipes. All exports are pure
 * data + pure functions; persistence and realtime wiring happen elsewhere.
 */

/* ── Named social principles ──────────────────────────────────────────── */

export type SocialPrinciple = {
  id: string;
  source: string;
  rule: string;
  appliesTo: readonly string[];
};

export const SOCIAL_PRINCIPLES: readonly SocialPrinciple[] = [
  {
    id: "feed-gravity",
    source: "TikTok For You",
    rule: "A feed must resolve into a single next-item within 150ms; no blank slates.",
    appliesTo: ["home-feed", "discover"],
  },
  {
    id: "story-layer",
    source: "Instagram Stories",
    rule: "Ephemeral layers stack on top of the permanent profile; tap-to-advance, hold-to-pause.",
    appliesTo: ["story-ring", "moment"],
  },
  {
    id: "reply-first",
    source: "Threads",
    rule: "Replies are first-class — render inline, not behind a modal.",
    appliesTo: ["post-card", "thread-view"],
  },
  {
    id: "realtime-quote",
    source: "X (Twitter)",
    rule: "Quotes must embed the source with visible attribution; no detached screenshots.",
    appliesTo: ["quote-card", "share-sheet"],
  },
  {
    id: "daily-prompt",
    source: "BeReal",
    rule: "Exactly one system prompt per day, randomized window, locks unrelated UI.",
    appliesTo: ["daily-moment", "home-hero"],
  },
  {
    id: "federation-hint",
    source: "Mastodon / Bluesky",
    rule: "Always surface the origin server/handle; never hide federation.",
    appliesTo: ["profile-header", "mention"],
  },
  {
    id: "custom-feed-recipe",
    source: "Bluesky",
    rule: "Users must be able to pick or author their feed algorithm, not just follow one.",
    appliesTo: ["feed-picker", "discover"],
  },
  {
    id: "identity-graph",
    source: "LinkedIn",
    rule: "Relationships have degrees (1st/2nd/3rd); expose the path, not just the name.",
    appliesTo: ["connection-card", "search"],
  },
  {
    id: "ephemeral-room",
    source: "Clubhouse / Snapchat",
    rule: "Ephemeral voice/video rooms evaporate after close — no replay by default.",
    appliesTo: ["live-room", "voice-stage"],
  },
  {
    id: "curated-board",
    source: "Pinterest / Lemon8",
    rule: "Interest boards drive discovery more than social graph for cold starts.",
    appliesTo: ["board", "collection"],
  },
  {
    id: "swipe-advance",
    source: "TikTok / Reels",
    rule: "Vertical swipe advances feed with rubber-band; horizontal swipe enters replies.",
    appliesTo: ["feed-card", "reels-player"],
  },
  {
    id: "reaction-tapback",
    source: "iMessage Tapback",
    rule: "Long-press yields quick reactions ≤ 7 options; one tap confirms, no modals.",
    appliesTo: ["post-card", "message-bubble"],
  },
] as const;

/* ── Feed recipes (Bluesky-style) ─────────────────────────────────────── */

export type FeedRecipeId = "chronological" | "for-you" | "moments" | "close-friends" | "discover";

export type FeedRecipe = {
  id: FeedRecipeId;
  label: string;
  /** Weight used by the ranking composer; higher = earlier. */
  weights: {
    recency: number;
    affinity: number;
    novelty: number;
    engagement: number;
  };
};

export const FEED_RECIPES: Record<FeedRecipeId, FeedRecipe> = {
  chronological: {
    id: "chronological",
    label: "시간순",
    weights: { recency: 1, affinity: 0, novelty: 0, engagement: 0 },
  },
  "for-you": {
    id: "for-you",
    label: "For You",
    weights: { recency: 0.3, affinity: 0.4, novelty: 0.2, engagement: 0.5 },
  },
  moments: {
    id: "moments",
    label: "순간",
    weights: { recency: 0.6, affinity: 0.3, novelty: 0.4, engagement: 0.2 },
  },
  "close-friends": {
    id: "close-friends",
    label: "가까운 친구",
    weights: { recency: 0.4, affinity: 1, novelty: 0.1, engagement: 0.3 },
  },
  discover: {
    id: "discover",
    label: "탐색",
    weights: { recency: 0.2, affinity: 0.1, novelty: 0.9, engagement: 0.6 },
  },
};

/* ── Ranking ──────────────────────────────────────────────────────────── */

export type FeedItem = {
  id: string;
  ageMinutes: number;
  affinity: number; // 0..1
  novelty: number; // 0..1
  engagement: number; // 0..1
};

/** Compose a deterministic ranking score for one item under a given recipe. */
export function scoreFeedItem(item: FeedItem, recipe: FeedRecipe): number {
  // Recency decays exponentially with a 24h half-life.
  const recencyScore = Math.exp(-item.ageMinutes / (60 * 24));
  const { weights } = recipe;
  return (
    weights.recency * recencyScore +
    weights.affinity * item.affinity +
    weights.novelty * item.novelty +
    weights.engagement * item.engagement
  );
}

/** Rank a feed under a named recipe, newest ties first. */
export function rankFeed(items: readonly FeedItem[], recipeId: FeedRecipeId): FeedItem[] {
  const recipe = FEED_RECIPES[recipeId];
  return [...items].sort((a, b) => {
    const diff = scoreFeedItem(b, recipe) - scoreFeedItem(a, recipe);
    if (diff !== 0) return diff;
    return a.ageMinutes - b.ageMinutes;
  });
}

/* ── Daily-prompt window (BeReal) ─────────────────────────────────────── */

/**
 * Given the local date and a stable seed (userId), deterministically decide
 * the 2-minute window within the day when the daily moment becomes active.
 * Returns minutes-since-midnight for the window start.
 */
export function dailyPromptWindowStart(dateKey: string, seed: string): number {
  const s = dateKey + ":" + seed;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const minuteOfDay = Math.abs(h) % (24 * 60);
  return minuteOfDay;
}

export function isDailyPromptActive(now: Date, windowStart: number, windowMins = 2): boolean {
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= windowStart && current < windowStart + windowMins;
}

/* ── Reaction palette (tapback) ───────────────────────────────────────── */

export const TAPBACK_REACTIONS = [
  { id: "heart", emoji: "♥", label: "하트" },
  { id: "spark", emoji: "✨", label: "반짝" },
  { id: "laugh", emoji: "😄", label: "웃음" },
  { id: "wow", emoji: "😮", label: "감탄" },
  { id: "sad", emoji: "😢", label: "슬픔" },
  { id: "fire", emoji: "🔥", label: "불" },
  { id: "seed", emoji: "🌱", label: "씨앗" },
] as const;

/** Trending emoji rotation — pure function of day-of-year. */
export function featuredReactionOfDay(dayOfYear: number): (typeof TAPBACK_REACTIONS)[number] {
  return TAPBACK_REACTIONS[dayOfYear % TAPBACK_REACTIONS.length];
}
