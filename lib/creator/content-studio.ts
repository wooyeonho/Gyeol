/**
 * Creator Economy — YouTube/Roblox-inspired user-generated content platform.
 *
 * Enables users to create, submit, and monetize content (stories, items, challenges).
 */

export type ContentType = "story" | "item_design" | "challenge" | "room_theme" | "creature_skin";

export type ContentStatus = "draft" | "submitted" | "reviewing" | "approved" | "rejected";

export interface CreatorContent {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  creatorId: string;
  status: ContentStatus;
  price: number; // in coins
  downloads: number;
  rating: number; // 0-5
  ratingCount: number;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorProfile {
  userId: string;
  displayName: string;
  totalEarnings: number;
  totalDownloads: number;
  contentCount: number;
  avgRating: number;
  tier: CreatorTier;
}

export type CreatorTier = "newcomer" | "contributor" | "creator" | "star" | "legend";

/** Minimum requirements per tier */
const TIER_THRESHOLDS: { tier: CreatorTier; minDownloads: number; minContent: number; minRating: number }[] = [
  { tier: "legend", minDownloads: 10000, minContent: 50, minRating: 4.5 },
  { tier: "star", minDownloads: 1000, minContent: 20, minRating: 4.0 },
  { tier: "creator", minDownloads: 100, minContent: 5, minRating: 3.5 },
  { tier: "contributor", minDownloads: 10, minContent: 2, minRating: 0 },
  { tier: "newcomer", minDownloads: 0, minContent: 0, minRating: 0 },
];

/**
 * Calculate creator tier based on metrics.
 */
export function calculateCreatorTier(
  totalDownloads: number,
  contentCount: number,
  avgRating: number,
): CreatorTier {
  for (const threshold of TIER_THRESHOLDS) {
    if (
      totalDownloads >= threshold.minDownloads &&
      contentCount >= threshold.minContent &&
      avgRating >= threshold.minRating
    ) {
      return threshold.tier;
    }
  }
  return "newcomer";
}

/**
 * Calculate revenue share based on tier.
 * Higher tiers get a larger cut.
 */
export function getRevenueShare(tier: CreatorTier): number {
  switch (tier) {
    case "legend": return 0.80;
    case "star": return 0.70;
    case "creator": return 0.60;
    case "contributor": return 0.50;
    case "newcomer": return 0.40;
  }
}

/**
 * Calculate earnings from a content download.
 */
export function calculateEarnings(price: number, tier: CreatorTier): {
  creatorEarnings: number;
  platformFee: number;
} {
  const share = getRevenueShare(tier);
  const creatorEarnings = Math.floor(price * share);
  return {
    creatorEarnings,
    platformFee: price - creatorEarnings,
  };
}

/**
 * Validate content submission.
 */
export function validateSubmission(content: {
  title: string;
  description: string;
  type: ContentType;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!content.title || content.title.length < 3) {
    errors.push("Title must be at least 3 characters");
  }
  if (content.title && content.title.length > 100) {
    errors.push("Title must be under 100 characters");
  }
  if (!content.description || content.description.length < 10) {
    errors.push("Description must be at least 10 characters");
  }
  if (content.description && content.description.length > 2000) {
    errors.push("Description must be under 2000 characters");
  }

  const validTypes: ContentType[] = ["story", "item_design", "challenge", "room_theme", "creature_skin"];
  if (!validTypes.includes(content.type)) {
    errors.push("Invalid content type");
  }

  return { valid: errors.length === 0, errors };
}

/** Content type display info */
export const CONTENT_TYPE_INFO: Record<ContentType, { icon: string; label: { ko: string; en: string } }> = {
  story: { icon: "📖", label: { ko: "스토리", en: "Story" } },
  item_design: { icon: "⚔️", label: { ko: "아이템 디자인", en: "Item Design" } },
  challenge: { icon: "🏆", label: { ko: "챌린지", en: "Challenge" } },
  room_theme: { icon: "🏠", label: { ko: "방 테마", en: "Room Theme" } },
  creature_skin: { icon: "🎨", label: { ko: "크리처 스킨", en: "Creature Skin" } },
};

/** Creator tier display info */
export const CREATOR_TIER_INFO: Record<CreatorTier, { icon: string; label: { ko: string; en: string }; color: string }> = {
  newcomer: { icon: "🌱", label: { ko: "신인", en: "Newcomer" }, color: "#9ca3af" },
  contributor: { icon: "⭐", label: { ko: "기여자", en: "Contributor" }, color: "#4ade80" },
  creator: { icon: "🔥", label: { ko: "크리에이터", en: "Creator" }, color: "#60a5fa" },
  star: { icon: "💫", label: { ko: "스타", en: "Star" }, color: "#c084fc" },
  legend: { icon: "👑", label: { ko: "레전드", en: "Legend" }, color: "#fbbf24" },
};
