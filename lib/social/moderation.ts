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

  return {
    sanitized,
    status: "approved",
    reason: null,
  };
}
