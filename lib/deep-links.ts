/**
 * Shareable deep-link patterns and utilities.
 *
 * Used by the share button, push notifications, and Open Graph
 * metadata to generate canonical URLs for in-app resources.
 */

// ── Pattern registry ──────────────────────────────────────────
export type DeepLinkType = "creature" | "post" | "profile" | "challenge";

interface DeepLinkPattern {
  /** Express-style path pattern for readability */
  pattern: string;
  /** Build the pathname from an id/slug */
  build: (id: string) => string;
  /** RegExp to match against a pathname and extract the id */
  regex: RegExp;
}

const DEEP_LINK_MAP: Record<DeepLinkType, DeepLinkPattern> = {
  creature: {
    pattern: "/creature/:name",
    build: (name) => `/creature/${encodeURIComponent(name)}`,
    regex: /^\/creature\/([^/]+)$/,
  },
  post: {
    pattern: "/social/post/:id",
    build: (id) => `/social/post/${encodeURIComponent(id)}`,
    regex: /^\/social\/post\/([^/]+)$/,
  },
  profile: {
    pattern: "/profile/:userId",
    build: (userId) => `/profile/${encodeURIComponent(userId)}`,
    regex: /^\/profile\/([^/]+)$/,
  },
  challenge: {
    pattern: "/challenge/:id",
    build: (id) => `/challenge/${encodeURIComponent(id)}`,
    regex: /^\/challenge\/([^/]+)$/,
  },
};

// ── Helpers ───────────────────────────────────────────────────

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

/**
 * Generate a fully-qualified shareable URL.
 *
 * @example
 * generateShareUrl("creature", "luna")
 * // => "https://gyeol.app/creature/luna"
 */
export function generateShareUrl(type: DeepLinkType, id: string): string {
  const pattern = DEEP_LINK_MAP[type];
  if (!pattern) {
    throw new Error(`Unknown deep link type: ${type}`);
  }
  return `${getBaseUrl()}${pattern.build(id)}`;
}

/**
 * Parse a pathname and extract the deep-link type + id.
 * Returns `null` if the pathname doesn't match any known pattern.
 *
 * @example
 * parseDeepLink("/social/post/abc123")
 * // => { type: "post", id: "abc123" }
 */
export function parseDeepLink(
  pathname: string,
): { type: DeepLinkType; id: string } | null {
  for (const [type, { regex }] of Object.entries(DEEP_LINK_MAP)) {
    const match = pathname.match(regex);
    if (match) {
      return { type: type as DeepLinkType, id: decodeURIComponent(match[1]) };
    }
  }
  return null;
}
