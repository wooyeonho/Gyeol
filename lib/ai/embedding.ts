import { logger } from "@/lib/logger";

/** Target dimension used by the pgvector column in the memories table. */
const TARGET_DIM = 768;

/**
 * Zero-pad a vector to TARGET_DIM so that shorter fallback embeddings
 * (e.g. Cloudflare bge-small 384-dim) can be stored in the vector(768) column.
 * Vectors that are already the correct length are returned unchanged.
 */
function padToTargetDim(vec: number[]): number[] {
  if (vec.length >= TARGET_DIM) return vec;
  const padded = new Array<number>(TARGET_DIM).fill(0);
  for (let i = 0; i < vec.length; i++) padded[i] = vec[i];
  return padded;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
        body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: TARGET_DIM }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const values: number[] = data.embedding?.values || [];
    return values.length > 0 ? padToTargetDim(values) : [];
  } catch (e) {
    logger.error("[Embed] Gemini failed", { error: e instanceof Error ? e.message : e });
  }
  const cfAccountId = process.env.CF_ACCOUNT_ID;
  const cfApiToken = process.env.CF_API_TOKEN;
  if (cfAccountId && cfApiToken) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/baai/bge-small-en-v1.5`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfApiToken}` }, body: JSON.stringify({ text: [text] }) }
      );
      if (!res.ok) throw new Error(`CF embed ${res.status}`);
      const data = await res.json();
      const vec: number[] = data.result?.data?.[0] || [];
      return vec.length > 0 ? padToTargetDim(vec) : [];
    } catch (e) {
      logger.error("[Embed] CF failed", e instanceof Error ? e : { error: e });
    }
  }
  return [];
}

/**
 * P4B: Use Gemini batchEmbedContents — single HTTP request for all texts.
 * TODO: Wire into autonomous cron jobs for bulk memory embedding (currently unused).
 */
export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await generateEmbedding(texts[0])];

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const requests = texts.map((text) => ({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: TARGET_DIM,
      }));
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({ requests }),
          signal: ctrl.signal,
        }
      );
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Gemini batch ${res.status}`);
      const data = await res.json();
      const embeddings: number[][] = (data.embeddings ?? []).map(
        (e: { values?: number[] }) => padToTargetDim(e.values ?? [])
      );
      if (embeddings.length === texts.length) return embeddings;
      // Partial result — fall through to individual calls
      logger.error(`[Embed] Batch returned ${embeddings.length}/${texts.length}, falling back`);
    } catch (e) {
      logger.error("[Embed] Gemini batch failed", e instanceof Error ? e : { error: e });
    }
  }

  // Fallback: individual calls in parallel
  return Promise.all(texts.map((t) => generateEmbedding(t)));
}
