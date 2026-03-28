const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CF_URL = (id: string) => `https://api.cloudflare.com/client/v4/accounts/${id}/ai/run/@cf/meta/llama-3.2-1b-instruct`;

interface Msg { role: string; content: string }
interface GroqCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}
interface CloudflareCompletionResponse {
  result?: { response?: string };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const MODELS = [
  { name: "meta-llama/llama-4-maverick-17b-128e-instruct", timeout: 20000 },
  { name: "meta-llama/llama-4-scout-17b-16e-instruct", timeout: 15000 },
  { name: "llama-3.1-8b-instant", timeout: 10000 },
];

async function callGroq(model: string, system: string, messages: Msg[], stream: boolean, timeout: number, maxTokens = 700, temp = 0.65) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages], stream, max_tokens: maxTokens, temperature: temp }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Groq ${model} ${res.status}`);
    return res;
  } catch (e) { clearTimeout(timer); throw e; }
}

async function callCF(system: string, messages: Msg[], stream: boolean) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) throw new Error("CF credentials not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(CF_URL(accountId), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ messages: [{ role: "system", content: system }, ...messages], stream }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`CF ${res.status}`);
    return res;
  } catch (e) { clearTimeout(timer); throw e; }
}

async function callGemini(system: string, messages: Msg[], maxTokens = 700, temp = 0.65): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens, temperature: temp },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) { clearTimeout(timer); throw e; }
}

async function callGeminiStream(system: string, messages: Msg[], maxTokens = 700, temp = 0.65): Promise<ReadableStream> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens, temperature: temp },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Gemini stream ${res.status}`);
    // Transform Gemini SSE to Groq-compatible SSE format
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    return new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            }
          } catch { /* skip non-JSON lines */ }
        }
      },
      cancel() { reader.cancel(); },
    });
  } catch (e) { clearTimeout(timer); throw e; }
}

function fallbackStream(text: string): ReadableStream {
  return new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      ctrl.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
}

export function getFallbackText(systemPrompt: string) {
  if (systemPrompt.includes("日本語")) return "...頭が少しぼんやりする。少し待っていて。";
  if (systemPrompt.includes("中文")) return "...脑子有点晕。等我一下。";
  if (systemPrompt.includes("español")) return "...La cabeza me da vueltas. Espérame un momento.";
  if (systemPrompt.includes("English")) return "...my head feels foggy right now. give me a moment.";
  return "...머리가 좀 멍해. 잠깐만 기다려줘.";
}

/** Derive max_tokens from verbal axis value embedded in the system prompt. */
function getMaxTokensFromVerbal(systemPrompt: string): number {
  const match = systemPrompt.match(/EXPRESSION MODE — (SILENT|MINIMAL|BRIEF|ELOQUENT|)/);
  if (!match) return 700;
  switch (match[1]) {
    case "SILENT":   return 15;
    case "MINIMAL":  return 20;
    case "BRIEF":    return 40;
    case "ELOQUENT": return 1000;
    default:         return 700;
  }
}

function getInCharacterFallback(systemPrompt: string) {
  if (systemPrompt.includes("日本語")) return "...ちょっと頭がぼんやりしてる。少し待ってくれる？";
  if (systemPrompt.includes("中文")) return "...脑袋有点发蒙。等我一下好吗？";
  if (systemPrompt.includes("español")) return "...Tengo la mente un poco nublada. ¿Puedes esperar un momento?";
  if (systemPrompt.includes("English")) return "...My head feels a bit foggy. Can you wait just a moment?";
  return "...머리가 좀 멍해. 잠깐만 기다려줘.";
}

export async function generateText(systemPrompt: string, messages: Msg[], maxTokens = 700): Promise<ReadableStream> {
  const effectiveMaxTokens = getMaxTokensFromVerbal(systemPrompt) !== 700
    ? getMaxTokensFromVerbal(systemPrompt) : maxTokens;
  for (const m of MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, true, m.timeout, effectiveMaxTokens);
      console.log(`[AI] Using ${m.name} (maxTokens=${effectiveMaxTokens})`);
      return res.body!;
    } catch (e) { console.error(`[AI] ${m.name} failed:`, e); }
  }
  // Gemini Flash streaming fallback (higher quality than CF 1B)
  try {
    const stream = await callGeminiStream(systemPrompt, messages, effectiveMaxTokens);
    console.log("[AI] Using Gemini Flash streaming");
    return stream;
  } catch (e) { console.error("[AI] Gemini stream failed:", e); }
  console.log("[AI] All models failed, using in-character fallback");
  return fallbackStream(getInCharacterFallback(systemPrompt));
}

export async function generateTextOnce(systemPrompt: string, userPrompt: string, opts?: { max_tokens?: number; temperature?: number }): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userPrompt }];
  const maxTokens = opts?.max_tokens ?? 500;
  const temp = opts?.temperature ?? 0.7;
  for (const m of MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, maxTokens, temp);
      const data = (await res.json()) as GroqCompletionResponse;
      return data.choices?.[0]?.message?.content || "";
    } catch (e) { console.error(`[AI] ${m.name} failed:`, e); }
  }
  // Gemini fallback (higher quality than CF 1B)
  try {
    const text = await callGemini(systemPrompt, messages, maxTokens, temp);
    if (text) {
      console.log("[AI] Using Gemini");
      return text;
    }
  } catch (e) { console.error("[AI] Gemini failed:", e); }
  // Cloudflare as last resort
  try {
    const res = await callCF(systemPrompt, messages, false);
    const data = (await res.json()) as CloudflareCompletionResponse;
    return data.result?.response || "";
  } catch (e) { console.error("[AI] CF failed:", e); }
  return "";
}

export async function generateJSON<T extends Record<string, unknown> = Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string
): Promise<T | null> {
  const messages: Msg[] = [{ role: "user", content: userPrompt }];

  // Attempt 1: try all models
  for (const m of MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, 300, 0.3);
      const data = (await res.json()) as GroqCompletionResponse;
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (isRecord(parsed)) return parsed as T;
    } catch (e) { console.error(`[JSON] ${m.name} attempt 1 failed:`, e); }
  }

  // Retry once after 500ms backoff (all models again)
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const m of MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, 300, 0.3);
      const data = (await res.json()) as GroqCompletionResponse;
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (isRecord(parsed)) return parsed as T;
    } catch (e) { console.error(`[JSON] ${m.name} attempt 2 failed:`, e); }
  }

  console.error("[JSON] All retries exhausted, returning null");
  return null;
}
