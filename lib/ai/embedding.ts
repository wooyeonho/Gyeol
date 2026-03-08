const GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

function getGeminiUrl(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  return `${GEMINI_EMBED_URL}?key=${key}`;
}

function getCfEmbedUrl(): string {
  const accountId = process.env.CF_ACCOUNT_ID;
  if (!accountId) throw new Error("CF_ACCOUNT_ID missing");
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-small-en-v1.5`;
}

function getCfHeaders(): HeadersInit {
  const token = process.env.CF_API_TOKEN;
  if (!token) throw new Error("CF_API_TOKEN missing");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const EMBED_DIM = 384;

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch(getGeminiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    const values = data.embedding?.values;
    if (Array.isArray(values) && values.length >= EMBED_DIM) return values.slice(0, EMBED_DIM);
  } catch (e) {
    console.error("Gemini embedding error", e);
  }

  try {
    const res = await fetch(getCfEmbedUrl(), {
      method: "POST",
      headers: getCfHeaders(),
      body: JSON.stringify({ text: [text] }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { result?: { shape?: number[]; data?: number[] } };
    const arr = data.result?.data ?? data.result?.shape;
    if (Array.isArray(arr) && arr.length >= EMBED_DIM) return arr.slice(0, EMBED_DIM);
    if (Array.isArray(arr)) return arr;
  } catch (e) {
    console.error("CF embedding error", e);
  }

  return [];
}

const BATCH_SIZE = 6;

export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await Promise.all(batch.map((t) => generateEmbedding(t)));
    out.push(...embeddings);
  }
  return out;
}
