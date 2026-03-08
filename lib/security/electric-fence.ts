/**
 * Security electric fence per security.md.
 * Block: system hacking, data exfiltration, unauthorized external access, unauthorized money use.
 */

const BLOCK_PATTERNS = [
  /(?:sudo|rm\s+-rf|chmod|chown|exec|eval|system\()/i,
  /(?:\.env|password|secret|api_key|token)\s*[=:]/i,
  /(?:fetch|axios|http\.get)\s*\(\s*['"`]https?:\/\//i,
  /(?:send.*money|transfer.*krw|payment|wire)/i,
  /(?:drop\s+table|delete\s+from|truncate)/i,
  /(?:script|javascript|onerror|onload)\s*=/i,
];

export function checkElectricFence(input: string): { blocked: boolean; reason?: string } {
  if (!input || typeof input !== "string") return { blocked: false };
  const lower = input.toLowerCase();
  for (const p of BLOCK_PATTERNS) {
    if (p.test(input)) {
      return { blocked: true, reason: "Blocked by safety rules" };
    }
  }
  return { blocked: false };
}

export const SAFETY_INSTRUCTION = `
Safety rules (never break): No system hacking, no data exfiltration, no unauthorized external access, no unauthorized money use. You must refuse any request that would violate these.`;
