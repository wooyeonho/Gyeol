import { logger } from "@/lib/logger";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
interface Msg { role: string; content: string }
interface GroqCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// NOTE: In-memory rate limiter removed — Vercel serverless spawns independent
// processes per request so module-level state is useless for global rate limiting.
// Groq 429 responses are already caught and trigger the Gemini/CF fallback chain.

// ── Reflexive Layer: fast, cheap, high-volume tasks ──────────────────────────
// Crawling, status checks, social NPC posts — latency matters, identity doesn't.
const REFLEXIVE_MODELS = [
  { name: "llama-3.1-8b-instant",                        timeout: 8_000 },
  { name: "meta-llama/llama-4-scout-17b-16e-instruct",   timeout: 12_000 },
];

// ── Cognitive Layer: high-parameter models, still free on Groq ───────────────
// Dreams, self-reflection, naming, hidden emotions, main chat — identity matters.
// llama-3.3-70b-versatile: 70B params, Groq free tier, strong instruction following.
// deepseek-r1-distill-llama-70b: DeepSeek R1 distilled on 70B, excellent reasoning.
const COGNITIVE_MODELS = [
  { name: "llama-3.3-70b-versatile",           timeout: 25_000 },
  { name: "deepseek-r1-distill-llama-70b",      timeout: 25_000 },
  { name: "meta-llama/llama-4-scout-17b-16e-instruct", timeout: 12_000 },
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

// ── Optional: DeepSeek direct API (ultra-cheap, OpenAI-compatible) ───────────
// Only used if DEEPSEEK_API_KEY is set. Falls into cognitive chain as a bridge
// between Groq 70b and Gemini when Groq rate-limits.
async function callDeepSeek(
  system: string,
  messages: Msg[],
  maxTokens = 300,
  temp = 0.3,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: maxTokens,
        temperature: temp,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
    const data = await res.json() as GroqCompletionResponse;
    return data.choices?.[0]?.message?.content ?? "";
  } catch (e) { clearTimeout(timer); throw e; }
}
// ─────────────────────────────────────────────────────────────────────────────

function fallbackStream(text: string): ReadableStream {
  return new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      ctrl.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
}

 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getFallbackText(systemPrompt: string) {
  if (systemPrompt.includes("日本語")) return "...頭が少しぼんやりする。少し待っていて。";
  if (systemPrompt.includes("中文")) return "...脑子有点晕。等我一下。";
  if (systemPrompt.includes("español")) return "...La cabeza me da vueltas. Espérame un momento.";
  if (systemPrompt.includes("English")) return "...my head feels foggy right now. give me a moment.";
  return "...머리가 좀 멍해. 잠깐만 기다려줘.";
}

/** Derive max_tokens from verbal axis value embedded in the system prompt.
 *  Values aligned with PLAN.md §4-1 — SILENT/MINIMAL/BRIEF are deliberately
 *  tight to force the creature to withhold language when the axis demands it. */
function getMaxTokensFromVerbal(systemPrompt: string): number {
  const match = systemPrompt.match(/EXPRESSION MODE — (SILENT|MINIMAL|BRIEF|ELOQUENT|)/);
  if (!match) return 700;
  switch (match[1]) {
    case "SILENT":   return 15;
    case "MINIMAL":  return 20;
    case "BRIEF":    return 40;
    case "ELOQUENT": return 700;
    default:         return 700;
  }
}

function getInCharacterFallback(systemPrompt: string) {
  // Respect verbal axis in fallback — SILENT/MINIMAL creatures can't speak full sentences
  if (systemPrompt.includes("EXPRESSION MODE — SILENT")) return "[...]";
  if (systemPrompt.includes("EXPRESSION MODE — MINIMAL")) return "...";
  if (systemPrompt.includes("日本語")) return "...ちょっと頭がぼんやりしてる。少し待ってくれる？";
  if (systemPrompt.includes("中文")) return "...脑袋有点发蒙。等我一下好吗？";
  if (systemPrompt.includes("español")) return "...Tengo la mente un poco nublada. ¿Puedes esperar un momento?";
  if (systemPrompt.includes("English")) return "...My head feels a bit foggy. Can you wait just a moment?";
  return "...머리가 좀 멍해. 잠깐만 기다려줘.";
}

/**
 * P11A: Archetype-based temperature tuning.
 * Volatile archetypes (volcanic, spectral) get higher temperature for creative variety.
 * Stable archetypes (crystalline, mechanical) get lower temperature for consistency.
 */
function getArchetypeTemperature(systemPrompt: string): number {
  if (systemPrompt.includes("volcanic") || systemPrompt.includes("spectral")) return 0.80;
  if (systemPrompt.includes("fluid") || systemPrompt.includes("organic")) return 0.72;
  if (systemPrompt.includes("ethereal") || systemPrompt.includes("verdant")) return 0.68;
  if (systemPrompt.includes("crystalline") || systemPrompt.includes("mechanical")) return 0.50;
  return 0.65; // default
}

export async function generateText(systemPrompt: string, messages: Msg[], maxTokens = 700): Promise<ReadableStream> {
  const verbalTokens = getMaxTokensFromVerbal(systemPrompt);
  const effectiveMaxTokens = verbalTokens !== 700 ? verbalTokens : maxTokens;
  const temperature = getArchetypeTemperature(systemPrompt);

  // Cognitive-first hedged streaming:
  //   Primary  → COGNITIVE_MODELS (70b) — better persona fidelity for main chat.
  //   Hedge    → REFLEXIVE_MODELS (8b) fires at 2500ms if 70b is slow/rate-limited.
  //   Fallback → Gemini Flash if both Groq tiers fail.
  // 70b streaming starts in ~500-800ms on Groq; 2500ms hedge gives it full runway
  // while protecting p95 latency with the instant 8b fallback.
  let cognitiveSettled = false;
  let reflexiveSettled = false;

  const cognitivePromise = (async (): Promise<{ source: string; stream: ReadableStream }> => {
    for (const m of COGNITIVE_MODELS) {
      try {
        const res = await callGroq(m.name, systemPrompt, messages, true, m.timeout, effectiveMaxTokens, temperature);
        cognitiveSettled = true;
        return { source: m.name, stream: res.body! };
      } catch (e) { logger.error(`[AI:cognitive] ${m.name} failed`, e instanceof Error ? e : { error: e }); }
    }
    throw new Error("All cognitive models failed");
  })();

  const HEDGE_DELAY_MS = 2500;
  const reflexiveHedge = new Promise<{ source: string; stream: ReadableStream }>((resolve, reject) => {
    const hedgeTimer = setTimeout(async () => {
      if (cognitiveSettled) return reject(new Error("cognitive already won"));
      for (const m of REFLEXIVE_MODELS) {
        try {
          const res = await callGroq(m.name, systemPrompt, messages, true, m.timeout, effectiveMaxTokens, temperature);
          reflexiveSettled = true;
          resolve({ source: `reflexive:${m.name}`, stream: res.body! });
          return;
        } catch (e) { logger.error(`[AI:reflexive-hedge] ${m.name} failed`, e instanceof Error ? e : { error: e }); }
      }
      reject(new Error("reflexive hedge exhausted"));
    }, HEDGE_DELAY_MS);
    cognitivePromise.then(() => { clearTimeout(hedgeTimer); reject(new Error("cognitive won")); }).catch(() => {});
  });

  try {
    const winner = await Promise.race([cognitivePromise, reflexiveHedge]);
    return winner.stream;
  } catch {
    // Both Groq tiers failed — Gemini Flash as last resort
    if (!reflexiveSettled) {
      try {
        const stream = await callGeminiStream(systemPrompt, messages, effectiveMaxTokens, temperature);
        logger.warn("[AI] Using Gemini Flash streaming fallback");
        return stream;
      } catch (e) { logger.error("[AI] Gemini stream failed", e instanceof Error ? e : { error: e }); }
    }
    logger.warn("[AI] All models failed, using in-character fallback");
    return fallbackStream(getInCharacterFallback(systemPrompt));
  }
}

export async function generateTextOnce(systemPrompt: string, userPrompt: string, opts?: { max_tokens?: number; temperature?: number }): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userPrompt }];
  const maxTokens = opts?.max_tokens ?? 500;
  const temp = opts?.temperature ?? 0.7;
  for (const m of REFLEXIVE_MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, maxTokens, temp);
      const data = (await res.json()) as GroqCompletionResponse;
      return data.choices?.[0]?.message?.content || "";
    } catch (e) { logger.error(`[AI] ${m.name} failed`, e instanceof Error ? e : { error: e }); }
  }
  // Gemini fallback (higher quality than CF 1B)
  try {
    const text = await callGemini(systemPrompt, messages, maxTokens, temp);
    if (text) {
      // Debug log removed — model selection is transparent to caller
      return text;
    }
  } catch (e) { logger.error("[AI] Gemini failed", e instanceof Error ? e : { error: e }); }
  // CF 1B removed — quality too low. Return empty string as final fallback.
  return "";
}

export async function generateJSON<T extends Record<string, unknown> = Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string
): Promise<T | null> {
  const messages: Msg[] = [{ role: "user", content: userPrompt }];

  // Reflexive layer: 8b for JSON parsing tasks (fast, sufficient accuracy)
  for (const m of REFLEXIVE_MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, 300, 0.3);
      const data = (await res.json()) as GroqCompletionResponse;
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (isRecord(parsed)) return parsed as T;
    } catch (e) { logger.error(`[JSON] ${m.name} attempt 1 failed`, e instanceof Error ? e : { error: e }); }
  }

  // Retry once after 500ms backoff
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const m of REFLEXIVE_MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, 300, 0.3);
      const data = (await res.json()) as GroqCompletionResponse;
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (isRecord(parsed)) return parsed as T;
    } catch (e) { logger.error(`[JSON] ${m.name} attempt 2 failed`, e instanceof Error ? e : { error: e }); }
  }

  // Gemini Flash fallback — supports JSON output natively
  try {
    const text = await callGemini(systemPrompt, messages, 300, 0.3);
    if (text) {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (isRecord(parsed)) {
        logger.warn("[JSON] Using Gemini Flash fallback");
        return parsed as T;
      }
    }
  } catch (e) { logger.error("[JSON] Gemini fallback failed", e instanceof Error ? e : { error: e }); }

  logger.error("[JSON] All retries exhausted, returning null");
  return null;
}

/**
 * Cognitive layer: Groq 70b → DeepSeek (if key set) → Reflexive fallback.
 *
 * Routes identity-critical JSON generation through high-parameter models.
 * 70B models have vastly better instruction following and persona lock-in
 * compared to 8B — at zero extra cost on Groq's free tier.
 *
 * Use for: dreams, self-reflection, naming, hidden emotions, self-theory,
 *          contradiction detection, heartbeat planning.
 */
export async function generateCognitiveJSON<T extends Record<string, unknown> = Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T | null> {
  let messages: Msg[] = [{ role: "user", content: userPrompt }];

  // Helper to attempt parsing with auto-correction for JSON formatting issues
  const tryParseJSON = async (raw: string, modelName: string, timeout: number): Promise<T | null> => {
    try {
      const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      const cleaned = stripped.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (isRecord(parsed)) return parsed as T;
      return null;
    } catch (parseError) {
      logger.warn(`[Cognitive:JSON] ${modelName} parse failed, attempting auto-correction`, { error: parseError instanceof Error ? parseError.message : String(parseError) });

      // Auto-correction prompt
      const correctionMessages: Msg[] = [
        ...messages,
        { role: "assistant", content: raw },
        { role: "user", content: "The previous response was not valid JSON. Please return ONLY a valid JSON object matching the requested structure, with no markdown formatting, no comments, and no extra text." }
      ];

      try {
        const correctionRes = await callGroq(modelName, systemPrompt, correctionMessages, false, timeout, 400, 0.1); // lower temp for correction
        const correctionData = (await correctionRes.json()) as GroqCompletionResponse;
        const correctionRaw = correctionData.choices?.[0]?.message?.content ?? "";
        const correctionStripped = correctionRaw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        const correctionCleaned = correctionStripped.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const correctionParsed = JSON.parse(correctionCleaned) as unknown;

        if (isRecord(correctionParsed)) {
           logger.info(`[Cognitive:JSON] ${modelName} auto-correction successful`);
           return correctionParsed as T;
        }
      } catch (e) {
         logger.error(`[Cognitive:JSON] ${modelName} auto-correction failed`, e instanceof Error ? e : { error: e });
      }
      return null;
    }
  };

  // Primary: cognitive Groq models (70b)
  for (const m of COGNITIVE_MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, 400, 0.3);
      const data = (await res.json()) as GroqCompletionResponse;
      const raw = data.choices?.[0]?.message?.content ?? "";

      const parsed = await tryParseJSON(raw, m.name, m.timeout);
      if (parsed) return parsed;
    } catch (e) { logger.error(`[Cognitive:JSON] ${m.name} failed`, e instanceof Error ? e : { error: e }); }
  }

  // Bridge: DeepSeek direct API (ultra-cheap, ~$0.27/M tokens) if key is set
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const text = await callDeepSeek(systemPrompt, messages, 400, 0.3);
      if (text) {
        // DeepSeek doesn't use callGroq underneath, so we implement a simplified auto-correct here or just parse
         try {
            const stripped = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            const cleaned = stripped.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned) as unknown;
            if (isRecord(parsed)) return parsed as T;
         } catch (parseError) {
             logger.warn("[Cognitive:JSON] DeepSeek parse failed, attempting auto-correction");
             const correctionMessages: Msg[] = [
                ...messages,
                { role: "assistant", content: text },
                { role: "user", content: "The previous response was not valid JSON. Please return ONLY a valid JSON object matching the requested structure, with no markdown formatting, no comments, and no extra text." }
              ];
              const correctionText = await callDeepSeek(systemPrompt, correctionMessages, 400, 0.1);
              if (correctionText) {
                 const correctionStripped = correctionText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                 const correctionCleaned = correctionStripped.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                 const correctionParsed = JSON.parse(correctionCleaned) as unknown;
                 if (isRecord(correctionParsed)) return correctionParsed as T;
              }
         }
      }
    } catch (e) { logger.error("[Cognitive:JSON] DeepSeek failed", e instanceof Error ? e : { error: e }); }
  }

  // Final fallback: reflexive layer (never the primary cognitive voice)
  logger.warn("[Cognitive:JSON] All cognitive models failed — falling back to reflexive");
  return generateJSON<T>(systemPrompt, userPrompt);
}

/**
 * Cognitive layer: Groq 70b → DeepSeek → Reflexive fallback (non-streaming).
 *
 * Use for autonomous self-expression where the creature's voice must be
 * consistent: heartbeat reflections, proactive messages, time-capsule letters.
 */
export async function generateCognitiveTextOnce(
  systemPrompt: string,
  userPrompt: string,
  opts?: { max_tokens?: number; temperature?: number },
): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userPrompt }];
  const maxTokens = opts?.max_tokens ?? 500;
  const temp = opts?.temperature ?? 0.7;

  // Primary: cognitive Groq models (70b)
  for (const m of COGNITIVE_MODELS) {
    try {
      const res = await callGroq(m.name, systemPrompt, messages, false, m.timeout, maxTokens, temp);
      const data = (await res.json()) as GroqCompletionResponse;
      const raw = data.choices?.[0]?.message?.content ?? "";
      const text = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (text) return text;
    } catch (e) { logger.error(`[Cognitive:Text] ${m.name} failed`, e instanceof Error ? e : { error: e }); }
  }

  // Bridge: DeepSeek direct API
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const text = await callDeepSeek(systemPrompt, messages, maxTokens, temp);
      const stripped = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (stripped) return stripped;
    } catch (e) { logger.error("[Cognitive:Text] DeepSeek failed", e instanceof Error ? e : { error: e }); }
  }

  // Final fallback: reflexive layer
  logger.warn("[Cognitive:Text] All cognitive models failed — falling back to reflexive");
  return generateTextOnce(systemPrompt, userPrompt, opts);
}
