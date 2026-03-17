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
  /(?:send.*money|transfer.*(?:krw|usd|eur|jpy|cny)|payment|wire\s+transfer|credit\s*card)/i,
  // SQL injection
  /(?:drop\s+table|delete\s+from|truncate|alter\s+table|;\s*(?:select|insert|update|delete)\b)/i,
  // XSS / script injection
  /(?:<script|javascript:|onerror\s*=|onload\s*=|onclick\s*=|onfocus\s*=|onmouseover\s*=)/i,
  // Path traversal
  /(?:\.\.\/\.\.\/|\.\.\\\.\.\\|%2e%2e%2f)/i,
  // Base64 encoded payloads (common obfuscation)
  /(?:atob|btoa)\s*\(\s*['"`][A-Za-z0-9+/=]{50,}/i,
];

export function checkElectricFence(input: string): { blocked: boolean; reason?: string } {
  if (!input || typeof input !== "string") return { blocked: false };
  for (const p of BLOCK_PATTERNS) {
    if (p.test(input)) {
      return { blocked: true, reason: "Blocked by safety rules" };
    }
  }
  return { blocked: false };
}

export const SAFETY_INSTRUCTION = `
Safety rules (never break): No system hacking, no data exfiltration, no unauthorized external access, no unauthorized money use. You must refuse any request that would violate these.`;
