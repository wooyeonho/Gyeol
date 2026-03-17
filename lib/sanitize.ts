/**
 * Strip HTML/script tags, SQL injection patterns, and prompt injection attempts.
 * React escapes on render; this guards server-side use and any future HTML output.
 */
export function sanitizeUserInput(text: string): string {
  return text
    // XSS: strip script tags and inline event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\bjavascript:/gi, "")
    // SQL injection: neutralize common SQL keywords used in injection
    .replace(/;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|TRUNCATE|EXEC)\b/gi, "; --blocked--")
    .replace(/('|")\s*(OR|AND)\s+\1?\s*\d+\s*=\s*\d+/gi, "")
    .replace(/UNION\s+(ALL\s+)?SELECT/gi, "")
    // Prompt injection: strip common prompt override attempts
    .replace(/\b(ignore\s+(all\s+)?(previous|above)\s+(instructions?|prompts?|rules?))/gi, "[filtered]")
    .replace(/\b(system\s*:\s*|SYSTEM\s+PROMPT|<<\s*SYS\s*>>)/gi, "[filtered]")
    .replace(/\b(you\s+are\s+now\s+|pretend\s+you\s+are\s+|act\s+as\s+(?:a\s+)?(?:different|new)\s+)/gi, "[filtered]")
    .trim();
}
