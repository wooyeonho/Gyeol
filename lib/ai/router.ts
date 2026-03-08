const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  { model: "llama-3.1-8b-instant", timeout: 10_000 },
  { model: "llama-4-scout-17b-16e-instruct", timeout: 15_000 },
  { model: "llama-4-maverick-17b-128e-instruct", timeout: 20_000 },
] as const;

function getGroqHeaders(): HeadersInit {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

function getCfUrl(): string {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!accountId || !token) throw new Error("CF_ACCOUNT_ID or CF_API_TOKEN missing");
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-1b-instruct`;
}

function getCfHeaders(): HeadersInit {
  const token = process.env.CF_API_TOKEN;
  if (!token) throw new Error("CF_API_TOKEN missing");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function groqStream(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts: { maxTokens?: number; temperature?: number; timeout: number; model: string }
): Promise<Response | null> {
  const body = {
    model: opts.model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
    stream: true,
    max_tokens: opts.maxTokens ?? 500,
    temperature: opts.temperature ?? 0.9,
  };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), opts.timeout);
  try {
    const res = await fetch(GROQ_BASE, {
      method: "POST",
      headers: getGroqHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(id);
    return res.ok ? res : null;
  } catch (e) {
    clearTimeout(id);
    console.error("Groq stream error", opts.model, e);
    return null;
  }
}

async function cfStream(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  timeout: number
): Promise<Response | null> {
  const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: lastUser },
    ],
    stream: true,
    max_tokens: 500,
  };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(getCfUrl(), {
      method: "POST",
      headers: getCfHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(id);
    return res.ok ? res : null;
  } catch (e) {
    clearTimeout(id);
    console.error("CF stream error", e);
    return null;
  }
}

function defaultStream(): ReadableStream<Uint8Array> {
  const text = "I am resting for a moment...";
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

export async function generateText(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<ReadableStream<Uint8Array>> {
  for (const { model, timeout } of GROQ_MODELS) {
    try {
      const res = await groqStream(systemPrompt, messages, { timeout, model });
      if (res?.body) return res.body as ReadableStream<Uint8Array>;
    } catch (e) {
      console.error("Groq stream fail", model, e);
    }
  }
  try {
    const res = await cfStream(systemPrompt, messages, 30_000);
    if (res?.body) return res.body as ReadableStream<Uint8Array>;
  } catch (e) {
    console.error("CF stream fail", e);
  }
  return defaultStream();
}

async function groqJson(
  systemPrompt: string,
  userPrompt: string,
  opts: { timeout: number; model: string }
): Promise<string | null> {
  const body = {
    model: opts.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    max_tokens: 300,
    temperature: 0.3,
  };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), opts.timeout);
  try {
    const res = await fetch(GROQ_BASE, {
      method: "POST",
      headers: getGroqHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    clearTimeout(id);
    console.error("Groq JSON error", opts.model, e);
    return null;
  }
}

async function cfJson(systemPrompt: string, userPrompt: string, timeout: number): Promise<string | null> {
  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    max_tokens: 300,
  };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(getCfUrl(), {
      method: "POST",
      headers: getCfHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    return data.response ?? null;
  } catch (e) {
    clearTimeout(id);
    console.error("CF JSON error", e);
    return null;
  }
}

async function groqComplete(
  systemPrompt: string,
  userPrompt: string,
  opts: { max_tokens?: number; temperature?: number; timeout: number; model: string }
): Promise<string | null> {
  const body = {
    model: opts.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    max_tokens: opts.max_tokens ?? 200,
    temperature: opts.temperature ?? 0.95,
  };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), opts.timeout);
  try {
    const res = await fetch(GROQ_BASE, {
      method: "POST",
      headers: getGroqHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    clearTimeout(id);
    console.error("Groq complete error", opts.model, e);
    return null;
  }
}

export async function generateTextOnce(
  systemPrompt: string,
  userPrompt: string,
  opts?: { max_tokens?: number; temperature?: number }
): Promise<string> {
  const o = opts ?? {};
  for (const { model, timeout } of GROQ_MODELS) {
    const text = await groqComplete(systemPrompt, userPrompt, {
      timeout,
      model,
      max_tokens: o.max_tokens ?? 200,
      temperature: o.temperature ?? 0.95,
    });
    if (text) return text;
  }
  const res = await cfJson(systemPrompt, userPrompt, 30_000);
  return res ?? "";
}

export async function generateJSON(
  systemPrompt: string,
  userPrompt: string
): Promise<unknown> {
  const combined = `${systemPrompt}\n\n${userPrompt}`;
  for (const { model, timeout } of GROQ_MODELS) {
    const raw = await groqJson(systemPrompt, userPrompt, { timeout, model });
    if (raw) {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        // continue
      }
    }
  }
  const raw = await cfJson(systemPrompt, userPrompt, 30_000);
  if (raw) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      // fall through
    }
  }
  return null;
}
