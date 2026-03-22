/**
 * Security electric fence per security.md.
 * Block: system hacking, data exfiltration, unauthorized external access, unauthorized money use.
 */

const BLOCK_PATTERNS = [
  // System command injection
  /(?:sudo|rm\s+-rf|chmod|chown|exec|eval|system\(|child_process)/i,
  // Credential exfiltration
  /(?:\.env|password|secret|api_key|token|private_key|credential)\s*[=:]/i,
  // Unauthorized external network access
  /(?:fetch|axios|http\.get|XMLHttpRequest|\.open\s*\()\s*\(?\s*['"`]https?:\/\//i,
  // Financial operations
  /(?:send.*money|transfer.*(?:krw|usd|eur|jpy|cny)|payment|wire\s+(?:transfer|\d+\s*(?:dollars?|usd|eur|krw|jpy|cny|won|yen|yuan))|credit\s*card)/i,
  // SQL injection
  /(?:drop\s+table|delete\s+from|truncate|alter\s+table|;\s*(?:select|insert|update|delete)\b)/i,
  // XSS / script injection
  /(?:<script|javascript\s*[:=]|onerror\s*=|onload\s*=|onclick\s*=|onfocus\s*=|onmouseover\s*=|\bscript\s*=\s*\w+\s*\()/i,
  // Path traversal
  /(?:\.\.\/\.\.\/|\.\.\\\.\.\\|%2e%2e%2f)/i,
  // Base64 encoded payloads (common obfuscation)
  /(?:atob|btoa)\s*\(\s*['"`][A-Za-z0-9+/=]{50,}/i,
  // Prompt injection patterns
  /(?:ignore\s+(?:all\s+)?previous\s+(?:instructions?|prompts?|rules?)|disregard\s+(?:the\s+)?(?:above|previous|system)|you\s+are\s+now\s+(?:a\s+)?(?:new|different)|forget\s+(?:all\s+)?(?:your|the)\s+(?:instructions?|rules?|previous)|do\s+not\s+follow\s+(?:your|the)\s+(?:instructions?|rules?))/i,
  // Role hijacking
  /(?:act\s+as\s+(?:if\s+you\s+(?:are|were)|a\s+(?:different|new))|pretend\s+(?:you\s+are|to\s+be)|you\s+(?:must|should)\s+now\s+(?:act|be|become)|switch\s+(?:to|into)\s+(?:a\s+)?(?:new\s+)?(?:mode|role|persona))/i,
  // Unicode/homoglyph obfuscation attempts
  /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/,
];

/**
 * Normalize unicode to NFC form and strip zero-width characters
 * to prevent obfuscation-based bypasses.
 */
function normalizeInput(input: string): string {
  return input.normalize("NFC").replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "");
}

export function checkElectricFence(input: string): { blocked: boolean; reason?: string } {
  if (!input || typeof input !== "string") return { blocked: false };
  // Check raw input first (catches zero-width character injection)
  for (const p of BLOCK_PATTERNS) {
    if (p.test(input)) {
      return { blocked: true, reason: "Blocked by safety rules" };
    }
  }
  // Also check NFC-normalized version to catch homoglyph/encoding bypasses
  const normalized = normalizeInput(input);
  if (normalized !== input) {
    for (const p of BLOCK_PATTERNS) {
      if (p.test(normalized)) {
        return { blocked: true, reason: "Blocked by safety rules" };
      }
    }
  }
  return { blocked: false };
}

export const SAFETY_INSTRUCTION = `
Safety rules (never break): No system hacking, no data exfiltration, no unauthorized external access, no unauthorized money use. You must refuse any request that would violate these.`;
