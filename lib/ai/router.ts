const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
interface Msg { role: string; content: string }
interface GroqCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
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

function fallbackStream(text: string): ReadableStream {
  return new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      ctrl.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
}

function getFallbackText(systemPrompt: string) {
  if (systemPrompt.includes("日本語")) return "...頭がちょっとぼんやりしてる。少し待ってて。";
  if (systemPrompt.includes("中文")) return "...脑子有点迷糊。等我一下。";
  if (systemPrompt.includes("español")) return "...mi cabeza está un poco confusa. Espera un momento.";
  if (systemPrompt.includes("English")) return "...my head feels a bit foggy. Give me a moment.";
  return "...머리가 좀 멍해. 잠깐만 기다려줘.";
}

export async function generateText(systemPrompt: string, messages: Msg[]): Promise<ReadableStream> {
  // Primary: Groq models (3 tiers)
  for (const m of MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, true, m.timeout);
      console.log(`[AI] Using ${m.name}`);
      return res.body!;
    } catch (e) { console.error(`[AI] ${m.name} failed:`, e); }
  }
  // Secondary: Gemini Flash (non-streaming, wrapped as SSE stream)
  try {
    const text = await callGemini(systemPrompt, messages);
    if (text) {
      console.log("[AI] Using Gemini Flash");
      return fallbackStream(text);
    }
  } catch (e) { console.error("[AI] Gemini failed:", e); }
  // Final: in-character fallback
  console.log("[AI] All models failed, using in-character fallback");
  return fallbackStream(getFallbackText(systemPrompt));
}

export async function generateTextOnce(systemPrompt: string, userPrompt: string, opts?: { max_tokens?: number; temperature?: number }): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userPrompt }];
  const maxTokens = opts?.max_tokens ?? 500;
  const temp = opts?.temperature ?? 0.7;
  // Primary: Groq models
  for (const m of MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, maxTokens, temp);
      const data = (await res.json()) as GroqCompletionResponse;
      return data.choices?.[0]?.message?.content || "";
    } catch (e) { console.error(`[AI] ${m.name} failed:`, e); }
  }
  // Secondary: Gemini Flash
  try {
    const text = await callGemini(systemPrompt, messages, maxTokens, temp);
    if (text) {
      console.log("[AI] Using Gemini");
      return text;
    }
  } catch (e) { console.error("[AI] Gemini failed:", e); }
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
