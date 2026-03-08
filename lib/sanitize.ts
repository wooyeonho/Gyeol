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
