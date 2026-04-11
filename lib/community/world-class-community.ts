/**
 * World-class community / forum patterns — from 10+ top community apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.13):
 *   Reddit, Discord, Lemmy/Kbin, Stack Overflow, Hacker News, Matrix,
 *   Slack 커뮤니티, Telegram 그룹, Mighty Networks, Circle.
 */

export type CommunityPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const COMMUNITY_PRINCIPLES: readonly CommunityPrinciple[] = [
  { id: "subs", source: "Reddit", rule: "Topic-based sub-communities have independent rules and moderators." },
  { id: "server-rooms", source: "Discord", rule: "A server holds many channels + voice rooms; switching is near-instant." },
  { id: "federated-forums", source: "Lemmy / Kbin", rule: "Forums federate over ActivityPub so no single host owns users." },
  { id: "reputation-qa", source: "Stack Overflow", rule: "Reputation is earned through answers judged useful by peers, not admin fiat." },
  { id: "concise-ranking", source: "Hacker News", rule: "Homepage fits 30 items and uses a single time-decayed score." },
  { id: "protocol-e2e", source: "Matrix", rule: "Community is a protocol concern, not a product concern — E2E by default." },
  { id: "workspace-community", source: "Slack Community", rule: "Workspaces can be public communities with join links and onboarding channels." },
  { id: "large-group", source: "Telegram", rule: "Groups scale to hundreds of thousands without losing thread context." },
  { id: "course-rooms", source: "Mighty Networks", rule: "Courses and community coexist — learning is a first-class activity." },
  { id: "curated-rooms", source: "Circle", rule: "Communities can be paid, gated, and curated with a polished member experience." },
] as const;

/* ── HN-style ranking ────────────────────────────────────────────────── */

/**
 * Hacker News ranking: (upvotes - 1) / (age_hours + 2)^gravity.
 */
export function hnScore(upvotes: number, ageHours: number, gravity = 1.8): number {
  return (upvotes - 1) / Math.pow(ageHours + 2, gravity);
}

export type Post = {
  id: string;
  upvotes: number;
  ageHours: number;
};

export function rankPosts(posts: readonly Post[]): Post[] {
  return [...posts].sort((a, b) => hnScore(b.upvotes, b.ageHours) - hnScore(a.upvotes, a.ageHours));
}

/* ── Reputation progression ─────────────────────────────────────────── */

export const REPUTATION_TIERS = [
  { min: 0, label: "신입", canPost: true, canVote: false },
  { min: 15, label: "초급", canPost: true, canVote: true },
  { min: 125, label: "중급", canPost: true, canVote: true },
  { min: 1000, label: "상급", canPost: true, canVote: true },
  { min: 5000, label: "마스터", canPost: true, canVote: true },
] as const;

export function reputationTier(rep: number): (typeof REPUTATION_TIERS)[number] {
  let tier: (typeof REPUTATION_TIERS)[number] = REPUTATION_TIERS[0];
  for (const t of REPUTATION_TIERS) {
    if (rep >= t.min) tier = t;
  }
  return tier;
}
