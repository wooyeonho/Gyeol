import { createServiceClient } from "@/lib/supabase/service";

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
const NEGATIVE_KEYWORDS = /fail|failed|failure|again|give up|lost|wrong|mistake|cannot|can't|couldn't|never|regret/i;

export function mightNeedReframe(userMessage: string): boolean {
  return NEGATIVE_KEYWORDS.test(userMessage.trim());
}

export async function getReframeMemories(agentId: string): Promise<{ content: string }[]> {
  const service = createServiceClient();
  const now = Date.now();
  const oldStart = new Date(now - THREE_MONTHS_MS - 30 * 24 * 60 * 60 * 1000).toISOString();
  const oldEnd = new Date(now - THREE_MONTHS_MS + 15 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .gte("created_at", oldStart)
    .lte("created_at", oldEnd)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!rows?.length) return [];
  const successLike = /success|achieve|done|did it|made it|happy|good|win|solved|finished|best|great/i;
  return (rows as { content?: string }[])
    .filter((r) => successLike.test(r.content ?? ""))
    .slice(0, 3)
    .map((r) => ({ content: r.content ?? "" }));
}

export async function getBestDayMemory(agentId: string): Promise<{ content: string } | null> {
  const service = createServiceClient();
  const { data: rows } = await service
    .from("memories")
    .select("content")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!rows?.length) return null;
  const positive = /happy|best|great|love|wonderful|amazing|joy|proud|good day|great day/i;
  const arr = rows as { content?: string }[];
  const found = arr.find((r) => positive.test(r.content ?? ""));
  if (found) return { content: found.content ?? "" };
  if (arr[0]) return { content: arr[0].content ?? "" };
  return null;
}
