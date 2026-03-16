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
  { name: "llama-4-maverick-17b-128e-instruct", timeout: 20000 },
  { name: "llama-4-scout-17b-16e-instruct", timeout: 15000 },
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
  if (systemPrompt.includes("日本語")) return "いま少しだけ整えています。少ししてからもう一度話しかけてください。";
  if (systemPrompt.includes("中文")) return "我现在需要短暂整理一下，请稍后再试一次。";
  if (systemPrompt.includes("español")) return "Necesito un momento para reorganizarme. Inténtalo de nuevo enseguida.";
  if (systemPrompt.includes("English")) return "I need a short reset right now. Please try again in a moment.";
  return "지금은 잠시 정리 중이에요. 조금 후에 다시 말해줘.";
}

export async function generateText(systemPrompt: string, messages: Msg[]): Promise<ReadableStream> {
  for (const m of MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, true, m.timeout);
      console.log(`[AI] Using ${m.name}`);
      return res.body!;
    } catch (e) { console.error(`[AI] ${m.name} failed:`, e); }
  }
  try {
    const res = await callCF(systemPrompt, messages, true);
    console.log("[AI] Using Cloudflare");
    return res.body!;
  } catch (e) { console.error("[AI] CF failed:", e); }
  console.log("[AI] All models failed, using fallback");
  return fallbackStream(getFallbackText(systemPrompt));
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
  for (const m of MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, 300, 0.3);
      const data = (await res.json()) as GroqCompletionResponse;
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (isRecord(parsed)) return parsed as T;
    } catch (e) { console.error(`[JSON] ${m.name} failed:`, e); }
  }
  return null;
}
