/**
 * World-class content/media patterns — synthesized from 11+ top streaming apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.2):
 *   Netflix, YouTube, Spotify, Apple TV+, Disney+, Twitch, Audible,
 *   HBO Max, Crunchyroll, Vimeo, Tubi/Pluto.
 *
 * Covers the three bones of a world-class content surface:
 *   1. Resume where you left off — never force users to re-find.
 *   2. Recommend the next thing with a clear why.
 *   3. Group content into editorial, personalized, and brand tiles.
 */

export type ContentPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const CONTENT_PRINCIPLES: readonly ContentPrinciple[] = [
  {
    id: "resume-hero",
    source: "Netflix",
    rule: "Home hero is whatever the user last consumed >10s, never the marketing featured.",
  },
  {
    id: "length-variable",
    source: "YouTube + Shorts",
    rule: "Same surface hosts long and short form; transitions between them never full-reload.",
  },
  {
    id: "daily-mix",
    source: "Spotify",
    rule: "A daily mix is computed at dawn and persists all day; no live re-shuffling.",
  },
  {
    id: "editorial-curation",
    source: "Apple TV+",
    rule: "Editorial picks outrank algorithmic for the first screen when catalog is small.",
  },
  {
    id: "brand-tile",
    source: "Disney+",
    rule: "Brand tiles group IP worlds; tapping enters a themed space, not a filter.",
  },
  {
    id: "live-overlay",
    source: "Twitch",
    rule: "Live chat and reactions render as a non-blocking overlay on top of video.",
  },
  {
    id: "session-sync",
    source: "Audible",
    rule: "Position syncs across devices within 2 seconds of pause.",
  },
  {
    id: "metadata-depth",
    source: "HBO Max",
    rule: "Every character, location, episode reference is a hyperlink into the catalog.",
  },
  {
    id: "culture-filter",
    source: "Crunchyroll",
    rule: "Cultural/language filters are first-class, not hidden under an advanced menu.",
  },
  {
    id: "quality-label",
    source: "Vimeo",
    rule: "Surface creator-quality tier visibly (Staff Pick, HDR, mastered-audio).",
  },
  {
    id: "ad-supported-tier",
    source: "Tubi / Pluto",
    rule: "Free ad-supported tier is one tap away from premium — never a dark pattern.",
  },
] as const;

/* ── Resume logic ─────────────────────────────────────────────────────── */

export type MediaSession = {
  id: string;
  startedAt: number;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
};

/** Netflix rule: auto-resume only if >10s consumed and <95% complete. */
export function shouldResume(session: MediaSession): boolean {
  if (session.positionSec < 10) return false;
  if (session.positionSec / session.durationSec >= 0.95) return false;
  return true;
}

/** Sort sessions to produce the "Continue" shelf. */
export function continueWatching(sessions: readonly MediaSession[]): MediaSession[] {
  return [...sessions]
    .filter(shouldResume)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/* ── Daily mix (Spotify) ──────────────────────────────────────────────── */

export type MixSeed = {
  id: string;
  tags: readonly string[];
  /** Last N plays of this item in the last 30d. Higher = more affinity. */
  plays: number;
};

/**
 * Pick a deterministic daily mix ordering. The *set* of items depends on
 * affinity; the *ordering* depends on the day hash so each day feels fresh
 * without recomputing scores at play time.
 */
export function dailyMix(
  seeds: readonly MixSeed[],
  dayKey: string,
  size = 20,
): MixSeed[] {
  const topByAffinity = [...seeds]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, Math.max(size, 40));

  // Deterministic shuffle using a hash of (dayKey, id).
  const hashOf = (id: string): number => {
    const s = dayKey + ":" + id;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  return topByAffinity
    .map((seed) => ({ seed, key: hashOf(seed.id) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, size)
    .map((x) => x.seed);
}

/* ── Shelf categories ─────────────────────────────────────────────────── */

export type ShelfKind =
  | "resume"
  | "editorial"
  | "daily-mix"
  | "because-you-watched"
  | "brand-world"
  | "trending"
  | "new-release"
  | "ad-supported-free";

export type Shelf = {
  kind: ShelfKind;
  title: string;
  priorityFn: (ctx: { catalogSize: number; hasResume: boolean }) => number;
};

export const DEFAULT_SHELVES: readonly Shelf[] = [
  {
    kind: "resume",
    title: "이어보기",
    priorityFn: (c) => (c.hasResume ? 100 : 0),
  },
  {
    kind: "editorial",
    title: "오늘의 에디터 선택",
    priorityFn: (c) => (c.catalogSize < 500 ? 90 : 60),
  },
  {
    kind: "daily-mix",
    title: "데일리 믹스",
    priorityFn: () => 80,
  },
  {
    kind: "because-you-watched",
    title: "방금 본 것과 비슷한",
    priorityFn: (c) => (c.hasResume ? 70 : 30),
  },
  {
    kind: "brand-world",
    title: "브랜드 월드",
    priorityFn: () => 55,
  },
  {
    kind: "trending",
    title: "지금 뜨는",
    priorityFn: () => 50,
  },
  {
    kind: "new-release",
    title: "새로 나온",
    priorityFn: () => 45,
  },
  {
    kind: "ad-supported-free",
    title: "무료로 볼 수 있는",
    priorityFn: () => 20,
  },
];

export function orderedShelves(ctx: { catalogSize: number; hasResume: boolean }): Shelf[] {
  return [...DEFAULT_SHELVES].sort((a, b) => b.priorityFn(ctx) - a.priorityFn(ctx));
}
