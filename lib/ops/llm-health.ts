/**
 * LLM API Key Health Checks
 *
 * Validates that configured LLM API keys (Groq, Gemini) are working.
 * Used by the ops/readiness endpoint to surface key expiry or quota issues.
 */

export type LLMProvider = "groq" | "gemini";

export type LLMHealthResult = {
  provider: LLMProvider;
  configured: boolean;
  healthy: boolean;
  latencyMs: number | null;
  error: string | null;
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function checkGroq(): Promise<LLMHealthResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { provider: "groq", configured: false, healthy: false, latencyMs: null, error: "GROQ_API_KEY not set" };
  }

  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        temperature: 0,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return { provider: "groq", configured: true, healthy: true, latencyMs, error: null };
    }

    const statusText = `HTTP ${res.status}`;
    if (res.status === 401) {
      return { provider: "groq", configured: true, healthy: false, latencyMs, error: `${statusText} - API key invalid or expired` };
    }
    if (res.status === 429) {
      return { provider: "groq", configured: true, healthy: false, latencyMs, error: `${statusText} - Rate limited or quota exceeded` };
    }
    return { provider: "groq", configured: true, healthy: false, latencyMs, error: statusText };
  } catch (e) {
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { provider: "groq", configured: true, healthy: false, latencyMs, error: msg };
  }
}

async function checkGemini(): Promise<LLMHealthResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { provider: "gemini", configured: false, healthy: false, latencyMs: null, error: "GEMINI_API_KEY not set" };
  }

  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1, temperature: 0 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return { provider: "gemini", configured: true, healthy: true, latencyMs, error: null };
    }

    const statusText = `HTTP ${res.status}`;
    if (res.status === 400 || res.status === 403) {
      return { provider: "gemini", configured: true, healthy: false, latencyMs, error: `${statusText} - API key invalid or expired` };
    }
    if (res.status === 429) {
      return { provider: "gemini", configured: true, healthy: false, latencyMs, error: `${statusText} - Rate limited or quota exceeded` };
    }
    return { provider: "gemini", configured: true, healthy: false, latencyMs, error: statusText };
  } catch (e) {
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { provider: "gemini", configured: true, healthy: false, latencyMs, error: msg };
  }
}

/**
 * Check health of all configured LLM providers.
 * Runs checks in parallel for speed.
 */
export async function checkLLMHealth(): Promise<LLMHealthResult[]> {
  return Promise.all([checkGroq(), checkGemini()]);
}
