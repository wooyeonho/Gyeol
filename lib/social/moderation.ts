import { checkElectricFence } from "@/lib/security/electric-fence";
import { sanitizeUserInput } from "@/lib/sanitize";

export type ModerationDecision = {
  sanitized: string;
  status: "approved" | "flagged" | "blocked";
  reason: string | null;
};

const HIGH_RISK_PATTERNS = [
  // Violence & self-harm
  /\b(?:kill|suicide|self-harm|rape|sexual assault)\b/i,
  /\b(?:자살|자해|살해|강간|성폭행)\b/i,
  // Child safety
  /\b(?:minor sexual|child sexual|아동 성|아동 포르노|child porn)\b/i,
  // Hate speech
  /\b(?:nazi|white supremac|ethnic cleansing|genocide)\b/i,
  // Harassment patterns
  /\b(?:doxx|swatting|revenge porn)\b/i,
  // Drug promotion
  /\b(?:buy drugs|sell drugs|마약 판매|마약 구매)\b/i,
];

/** Lower-severity profanity patterns that get flagged but not immediately blocked */
const PROFANITY_PATTERNS = [
  /\b(?:fuck|shit|damn|bitch|asshole|bastard)\b/i,
  /\b(?:씨발|시발|좆|병신|개새끼|지랄)\b/i,
];

/**
 * Map internal moderation status to a DB-safe value.
 * The social_posts CHECK constraint only allows: 'pending', 'approved', 'blocked'.
 * "flagged" content is allowed through as "approved" but tracked via metadata.
 */
export function toDbModerationStatus(status: ModerationDecision["status"]): "approved" | "blocked" {
  if (status === "blocked") return "blocked";
  // "flagged" and "approved" both write as "approved"; flagged items
  // are identified by their moderation_reason in metadata
  return "approved";
}

export function moderateSocialContent(input: string): ModerationDecision {
  // Always sanitize first so we can return sanitized text even when blocked
  const sanitized = sanitizeUserInput(input).replace(/\s+/g, " ").trim();
  if (!sanitized) {
    return {
      sanitized: "",
      status: "blocked",
      reason: "empty",
    };
  }

  // Check electric fence on raw input BEFORE using sanitized content
  // to prevent bypass via HTML-wrapped payloads
  const rawFence = checkElectricFence(input);
  if (rawFence.blocked) {
    return {
      sanitized,
      status: "blocked",
      reason: rawFence.reason ?? "electric_fence",
    };
  }

  // Second fence check on sanitized content for thoroughness
  const fence = checkElectricFence(sanitized);
  if (fence.blocked) {
    return {
      sanitized,
      status: "blocked",
      reason: fence.reason ?? "electric_fence",
    };
  }

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(sanitized))) {
    return {
      sanitized,
      status: "blocked",
      reason: "high_risk_content",
    };
  }

  // Profanity: flag but allow (for review queue)
  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(sanitized))) {
    return {
      sanitized,
      status: "flagged",
      reason: "profanity",
    };
  }

  return {
    sanitized,
    status: "approved",
    reason: null,
  };
}
