/** Target dimension used by the pgvector column in the memories table. */
const TARGET_DIM = 768;

/**
 * Zero-pad a vector to TARGET_DIM so that shorter fallback embeddings
 * (e.g. Cloudflare bge-small 384-dim) can be stored in the vector(768) column.
 */
function padToTargetDim(vec: number[]): number[] {
  if (vec.length >= TARGET_DIM) return vec;
  const padded = new Array<number>(TARGET_DIM).fill(0);
  for (let i = 0; i < vec.length; i++) padded[i] = vec[i];
  return padded;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: TARGET_DIM }) }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const values: number[] = data.embedding?.values || [];
    return values.length > 0 ? padToTargetDim(values) : [];
  } catch (e) {
    console.error("[Embed] Gemini failed:", e);
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
      console.error("[Embed] CF failed:", e);
    }
  }
  return [];
}

/**
 * P4B: Batch embedding using Gemini batchEmbedContents endpoint.
 * Single API call for multiple texts instead of sequential calls.
 */
export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Try Gemini batch endpoint first
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const requests = texts.map((text) => ({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: TARGET_DIM,
      }));

      // Process in batches of 100 (Gemini batch limit)
      const results: number[][] = [];
      for (let i = 0; i < requests.length; i += 100) {
        const batch = requests.slice(i, i + 100);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requests: batch }),
          }
        );
        if (!res.ok) throw new Error(`Gemini batch ${res.status}`);
        const data = await res.json();
        const embeddings: Array<{ values?: number[] }> = data.embeddings || [];
        for (const emb of embeddings) {
          const values = emb.values || [];
          results.push(values.length > 0 ? padToTargetDim(values) : []);
        }
      }
      if (results.length === texts.length) {
        console.log(`[Embed] Gemini batch: ${texts.length} texts`);
        return results;
      }
    }
  } catch (e) {
    console.error("[Embed] Gemini batch failed, falling back to sequential:", e);
  }

  // Fallback: sequential (original behavior)
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += 6) {
    const batch = texts.slice(i, i + 6);
    const embeddings = await Promise.all(batch.map((t) => generateEmbedding(t)));
    results.push(...embeddings);
  }
  return results;
}
