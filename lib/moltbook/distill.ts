import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { logger } from "@/lib/logger";

const BATCH_SIZE = 10;
const MAX_ENTRIES_PER_AGENT = 200;
const MAX_CREATE_PER_CALL = 3;

const DISTILL_MEMORY_TYPES = [
  "rss_learner",
  "conversation",
  "autonomous_living",
  "dream",
  "observation",
];

const VALID_SOURCE_TYPES = new Set(["rss", "crawl", "conversation", "social", "dream", "self", "shared"]);

interface DistilledEntry {
  topic: string;
  summary: string;
  confidence: number;
  tags: string[];
  source_type: string;
}

/**
 * Distill recent memories into structured MoltBook entries.
 * Returns the number of entries created.
 */
export async function distillMemoriesToMoltBook(agentId: string): Promise<number> {
  const db = createServiceClient();

  // Resolve agent locale for language context
  const { data: agentState } = await db
    .from("agent_state")
    .select("config")
    .eq("agent_id", agentId)
    .single();

  const config = (agentState?.config as Record<string, unknown>) ?? {};
  const locale = typeof config.preferred_locale === "string" ? config.preferred_locale : "en";

  // Check current entry count
  const { count } = await db
    .from("moltbook_entries")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId);

  if ((count ?? 0) >= MAX_ENTRIES_PER_AGENT) {
    logger.warn(`[MoltBook] Agent ${agentId} at capacity (${count}/${MAX_ENTRIES_PER_AGENT})`);
    return 0;
  }

  // Fetch recent memories to distill
  const { data: memories } = await db
    .from("memories")
    .select("id, content, type, created_at")
    .eq("agent_id", agentId)
    .in("type", DISTILL_MEMORY_TYPES)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!memories || memories.length === 0) return 0;

  // Process in batches
  let created = 0;
  const batch = memories.slice(0, BATCH_SIZE);
  const memoryTexts = batch
    .map((m) => `[${String(m.type)}] ${String(m.content ?? "").slice(0, 300)}`)
    .join("\n---\n");

  const systemPrompt = [
    "You are a knowledge distillation engine.",
    `The agent's locale is "${locale}".`,
    "Extract structured knowledge from the provided memories.",
    "Return a JSON array of objects with: topic (string), summary (string), confidence (0.0-1.0), tags (string[]), source_type (one of: rss, crawl, conversation, social, dream, self).",
    `Return at most ${MAX_CREATE_PER_CALL} entries. Only include genuinely useful knowledge.`,
    "Return ONLY the JSON array, no markdown.",
  ].join(" ");

  const result = await generateJSON<{ entries?: DistilledEntry[] }>(
    systemPrompt,
    memoryTexts
  );

  if (!result) return 0;

  // Handle both array and object responses
  const entries: DistilledEntry[] = Array.isArray(result)
    ? (result as unknown as DistilledEntry[])
    : result.entries ?? [];

  for (const entry of entries.slice(0, MAX_CREATE_PER_CALL)) {
    if (!entry.topic || !entry.summary) continue;
    if (created >= MAX_CREATE_PER_CALL) break;

    try {
      const embedding = await generateEmbedding(`${entry.topic}: ${entry.summary}`);

      const { error } = await db.from("moltbook_entries").insert({
        agent_id: agentId,
        topic: entry.topic,
        summary: entry.summary,
        source_type: VALID_SOURCE_TYPES.has(entry.source_type) ? entry.source_type : "self",
        confidence: Math.min(1, Math.max(0, entry.confidence ?? 0.5)),
        tags: entry.tags ?? [],
        embedding: embedding.length > 0 ? embedding : null,
        is_public: false,
      });

      if (!error) {
        created++;
      } else {
        logger.error("[MoltBook] Insert error", { error: error.message });
      }
    } catch (e) {
      logger.error("[MoltBook] Distill entry error", e instanceof Error ? e : { error: e });
    }
  }

  // Debug log removed — return value carries the count
  return created;
}
