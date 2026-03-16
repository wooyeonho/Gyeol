/**
 * Strip HTML/script to prevent XSS when user content is used in prompts or stored.
 * React escapes on render; this guards server-side use and any future HTML output.
 */
export function sanitizeUserInput(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\bjavascript:/gi, "")
    .trim();
}

/**
 * Strip common markdown syntax so LLM responses render as clean plain text.
 * Safety net for cases where the system prompt instruction is ignored.
 */
export function stripMarkdownForDisplay(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, "").trim())   // fenced code blocks
    .replace(/`([^`]+)`/g, "$1")                                        // inline code
    .replace(/\*\*(.+?)\*\*/g, "$1")                                    // **bold**
    .replace(/\*(.+?)\*/g, "$1")                                        // *italic*
    .replace(/^#{1,6}\s+/gm, "")                                        // # headings
    .replace(/^>\s?/gm, "")                                             // > blockquotes
    .trim();
}
