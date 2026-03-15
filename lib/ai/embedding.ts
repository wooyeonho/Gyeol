export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: { parts: [{ text }] } }) }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    return data.embedding?.values || [];
  } catch (e) {
    console.error("[Embed] Gemini failed:", e);
  }
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
      { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CF_API_TOKEN}` }, body: JSON.stringify({ text: [text] }) }
    );
    if (!res.ok) throw new Error(`CF embed ${res.status}`);
    const data = await res.json();
    return data.result?.data?.[0] || [];
  } catch (e) {
    console.error("[Embed] CF failed:", e);
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
