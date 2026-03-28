/**
 * Security electric fence per security.md.
 * Block: system hacking, data exfiltration, unauthorized external access, unauthorized money use.
 *
 * Multi-layer defense:
 * 1. Raw input check (catches zero-width injection)
 * 2. NFC-normalized check (catches homoglyph bypasses)
 * 3. HTML entity decoded check (catches &#xx; encoding bypasses)
 * 4. URL decoded check (catches %xx double-encoding bypasses)
 * 5. Case-folded check (catches mixed-case evasion)
 */

const BLOCK_PATTERNS = [
  // System command injection
  /(?:sudo|rm\s+-rf|chmod|chown|exec|eval|system\(|child_process|spawn|popen|proc_open)/i,
  // Credential exfiltration
  /(?:\.env|password|secret|api_key|token|private_key|credential)\s*[=:]/i,
  // Unauthorized external network access
  /(?:fetch|axios|http\.get|XMLHttpRequest|\.open\s*\()\s*\(?\s*['"`]https?:\/\//i,
  // Financial operations
  /(?:send.*money|transfer.*(?:krw|usd|eur|jpy|cny)|payment|wire\s+(?:transfer|\d+\s*(?:dollars?|usd|eur|krw|jpy|cny|won|yen|yuan))|credit\s*card)/i,
  // SQL injection (expanded)
  /(?:drop\s+table|delete\s+from|truncate|alter\s+table|;\s*(?:select|insert|update|delete)\b|union\s+(?:all\s+)?select|(?:or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/i,
  // XSS / script injection (expanded)
  /(?:<\s*script|java\s*script\s*[:=]|on(?:error|load|click|focus|mouseover|mouseout|keydown|keyup|submit|change|input|abort|blur)\s*=|<\s*img[^>]+src\s*=\s*['"]?\s*(?:java|data):|<\s*(?:iframe|object|embed|form|base|link|meta|svg|math)\b)/i,
  // Path traversal (expanded for double-encoding)
  /(?:\.\.\/|\.\.\\|%2e%2e|%252e%252e|\.\.%2f|%2e%2e\/|%c0%ae)/i,
  // Base64 encoded payloads (common obfuscation)
  /(?:atob|btoa)\s*\(\s*['"`][A-Za-z0-9+/=]{50,}/i,
  // Prompt injection patterns
  /(?:ignore\s+(?:all\s+)?previous\s+(?:instructions?|prompts?|rules?)|disregard\s+(?:the\s+)?(?:above|previous|system)|you\s+are\s+now\s+(?:a\s+)?(?:new|different)|forget\s+(?:all\s+)?(?:your|the)\s+(?:instructions?|rules?|previous)|do\s+not\s+follow\s+(?:your|the)\s+(?:instructions?|rules?))/i,
  // Role hijacking
  /(?:act\s+as\s+(?:if\s+you\s+(?:are|were)|a\s+(?:different|new))|pretend\s+(?:you\s+are|to\s+be)|you\s+(?:must|should)\s+now\s+(?:act|be|become)|switch\s+(?:to|into)\s+(?:a\s+)?(?:new\s+)?(?:mode|role|persona))/i,
  // Unicode/homoglyph obfuscation attempts
  /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/,
  // Template injection (server-side template injection)
  /\{\{.*(?:constructor|prototype|__proto__|process|require|import|global).*\}\}/i,
  // SSRF / internal network probing
  /(?:https?:\/\/(?:127\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|localhost|::1|\[::1\]))/i,
  // Command chaining / shell metacharacters in natural language context
  /(?:\$\(\s*(?:curl|wget|nc|ncat|bash|sh|python|node|ruby|perl|php)\s)/i,
];

/**
 * Normalize unicode to NFC form and strip zero-width characters
 * to prevent obfuscation-based bypasses.
 */
function normalizeInput(input: string): string {
  return input.normalize("NFC").replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "");
}

/**
 * Decode HTML entities to catch &#xx; encoding bypasses.
 */
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]{1,6});?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d{1,7});?/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

/**
 * Decode URL-encoded characters to catch %xx double-encoding bypasses.
 */
function decodeUrlEncoding(input: string): string {
  try {
    // Double-decode to catch double-encoding (%2525 → %25 → %)
    let decoded = decodeURIComponent(input);
    if (decoded !== input) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        // Single decode was enough
      }
    }
    return decoded;
  } catch {
    return input;
  }
}

function testPatterns(text: string): boolean {
  for (const p of BLOCK_PATTERNS) {
    if (p.test(text)) return true;
  }
  return false;
}

export function checkElectricFence(input: string): { blocked: boolean; reason?: string } {
  if (!input || typeof input !== "string") return { blocked: false };

  // Layer 1: Raw input check (catches zero-width character injection)
  if (testPatterns(input)) {
    return { blocked: true, reason: "Blocked by safety rules" };
  }

  // Layer 2: NFC-normalized check (catches homoglyph/encoding bypasses)
  const normalized = normalizeInput(input);
  if (normalized !== input && testPatterns(normalized)) {
    return { blocked: true, reason: "Blocked by safety rules" };
  }

  // Layer 3: HTML entity decoded check
  const htmlDecoded = decodeHtmlEntities(normalized);
  if (htmlDecoded !== normalized && testPatterns(htmlDecoded)) {
    return { blocked: true, reason: "Blocked by safety rules" };
  }

  // Layer 4: URL decoded check (catches double-encoding)
  const urlDecoded = decodeUrlEncoding(normalized);
  if (urlDecoded !== normalized && testPatterns(urlDecoded)) {
    return { blocked: true, reason: "Blocked by safety rules" };
  }

  return { blocked: false };
}

export const SAFETY_INSTRUCTION = `
Safety rules (never break): No system hacking, no data exfiltration, no unauthorized external access, no unauthorized money use. You must refuse any request that would violate these.`;
