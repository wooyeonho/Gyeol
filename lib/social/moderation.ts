import { checkElectricFence } from "@/lib/security/electric-fence";
import { sanitizeUserInput } from "@/lib/sanitize";

export type ModerationDecision = {
  sanitized: string;
  status: "approved" | "blocked";
  reason: string | null;
};

const HIGH_RISK_PATTERNS = [
  /\b(?:kill|suicide|self-harm|rape|sexual assault)\b/i,
  /\b(?:자살|자해|살해|강간|성폭행)\b/i,
  /\b(?:minor sexual|child sexual|아동 성)\b/i,
];

/**
 * Synchronous rule-based moderation (fast path).
 * Blocks obviously harmful content via regex + electric fence.
 */
export function moderateSocialContent(input: string): ModerationDecision {
  const sanitized = sanitizeUserInput(input).replace(/\s+/g, " ").trim();
  if (!sanitized) {
    return {
      sanitized: "",
      status: "blocked",
      reason: "empty",
    };
  }

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

  return {
    sanitized,
    status: "approved",
    reason: null,
  };
}

/**
 * AI-enhanced moderation for social/public content.
 * Runs the fast regex path first, then calls AI for nuanced analysis
 * on content that passes the regex filter.
 * Returns the same ModerationDecision shape for drop-in compatibility.
 */
export async function moderateSocialContentAI(input: string): Promise<ModerationDecision> {
  // Fast path: regex-based blocking
  const regexResult = moderateSocialContent(input);
  if (regexResult.status === "blocked") return regexResult;

  // AI moderation for content that passed regex filters
  try {
    const { generateJSON } = await import("@/lib/ai/router");
    const result = await generateJSON<{
      safe: boolean;
      category?: string;
      confidence?: number;
    }>(
      `You are a content moderation system. Classify whether the following user-generated social content is safe to publish. Consider: hate speech, harassment, threats, sexual content involving minors, doxxing, scams. Respond ONLY with valid JSON.`,
      `Content to moderate: "${regexResult.sanitized.slice(0, 500)}"\n\nJSON: {"safe": true/false, "category": "reason if unsafe", "confidence": 0.0-1.0}`
    );

    if (result && !result.safe && (result.confidence ?? 0) > 0.7) {
      return {
        sanitized: regexResult.sanitized,
        status: "blocked",
        reason: `ai_moderation: ${result.category ?? "unsafe_content"}`,
      };
    }
  } catch {
    // AI moderation failure should not block content — fall through to approved
  }

  return regexResult;
}
