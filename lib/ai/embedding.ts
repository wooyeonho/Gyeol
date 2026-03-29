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

export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += 6) {
    const batch = texts.slice(i, i + 6);
    const embeddings = await Promise.all(batch.map((t) => generateEmbedding(t)));
    results.push(...embeddings);
  }
  return results;
}
