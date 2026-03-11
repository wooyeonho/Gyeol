import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";
import { generateTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { capText, isMeaningfulAutonomousOutput, isRepetitiveOutput } from "@/lib/autonomy/self-regulation";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { sortResearchTasks } from "@/lib/goals/task-utils";

type PendingResearchTask = {
  id: string;
  title?: string | null;
  priority?: number | null;
  source?: string | null;
  attempt_count?: number | null;
  last_attempted_at?: string | null;
  created_at?: string | null;
};

function selectLearnerTask(
  tasks: PendingResearchTask[]
): PendingResearchTask | undefined {
  const preferred = tasks.filter((task) => {
    const source = String(task.source ?? "chat");
    return source === "heartbeat_learner" || source === "learner" || source === "chat";
  });
  const target = preferred.length > 0 ? preferred : tasks;
  return sortResearchTasks(target)[0];
}

const DEFAULT_FEED_URLS = [
  "https://hnrss.org/frontpage",
  "https://www.reddit.com/r/technology/.rss",
  "https://techcrunch.com/feed/",
];

function isPrivateHost(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower === "::1" || lower.endsWith(".local")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) {
    const [a, b] = lower.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function sanitizeFeedUrls(urls: string[]): string[] {
  const out: string[] = [];
  for (const raw of urls) {
    try {
      const u = new URL(raw);
      if (!["http:", "https:"].includes(u.protocol)) continue;
      if (isPrivateHost(u.hostname)) continue;
      out.push(u.toString());
    } catch {
      // ignore invalid URL
    }
  }
  return out;
}

function getFeedUrls(body: unknown): string[] {
  if (body && typeof body === "object" && "feed_urls" in body && Array.isArray((body as { feed_urls?: string[] }).feed_urls)) {
    const urls = (body as { feed_urls: string[] }).feed_urls.filter((u): u is string => typeof u === "string");
    const sanitized = sanitizeFeedUrls(urls);
    if (sanitized.length > 0) return sanitized;
  }
  const env = process.env.FEED_URLS;
  if (env && typeof env === "string") {
    return sanitizeFeedUrls(env.split(",").map((u) => u.trim()).filter(Boolean));
  }
  return sanitizeFeedUrls(DEFAULT_FEED_URLS);
}

async function fetchRssItems(url: string): Promise<{ title: string; link?: string; description?: string }[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "GYEOL-RSS-Learner/1.0" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: { title: string; link?: string; description?: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let m;
    while ((m = itemRegex.exec(xml)) !== null) {
      const block = m[1];
      const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
      const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? block.match(/<link[^>]*href="([^"]+)"/i)?.[1];
      const desc = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<[^>]+>/g, "").trim();
      if (title) items.push({ title, link, description: desc });
    }
    if (items.length === 0) {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      while ((m = entryRegex.exec(xml)) !== null) {
        const block = m[1];
        const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
        const link = block.match(/<link[^>]*href="([^"]+)"/i)?.[1];
        const summary = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.replace(/<[^>]+>/g, "").trim();
        if (title) items.push({ title, link, description: summary });
      }
    }
    return items.slice(0, 5);
  } catch (e) {
    console.error("RSS fetch error", url, e);
    return [];
  }
}

async function runLearner(feedUrls: string[]): Promise<{ processed: number; items_fetched: number }> {
  const service = createServiceClient();
  const { data: agents } = await service.from("agents").select("id");
  if (!agents?.length) {
    return { processed: 0, items_fetched: 0 };
  }

  const allItems: { title: string; link?: string; description?: string; source: string }[] = [];
  for (const url of feedUrls) {
    const items = await fetchRssItems(url);
    const source = new URL(url).hostname;
    for (const it of items) {
      allItems.push({ ...it, source });
    }
  }

  if (allItems.length === 0) {
    return { processed: 0, items_fetched: 0 };
  }

  const sample = allItems.slice(0, 10);
  const rawText = sample.map((i) => `[${i.source}] ${i.title}: ${(i.description ?? "").slice(0, 200)}`).join("\n\n");

  let summary: string;
  try {
    summary = await generateTextOnce(
      "You are a knowledge summarizer. Output in Korean.",
      `Summarize these RSS headlines into 2-3 key insights for an AI agent to learn:\n\n${rawText}\n\nOutput: concise insights only.`,
      { max_tokens: 300, temperature: 0.5 }
    );
  } catch (e) {
    console.error("learner summary", e);
    summary = rawText.slice(0, 500);
  }

  const content = capText(`RSS 학습: ${summary}`, 900);
  if (!isMeaningfulAutonomousOutput(content)) {
    return { processed: 0, items_fetched: allItems.length };
  }
  let embedding: number[] = [];
  try {
    embedding = await generateEmbedding(content);
  } catch (e) {
    console.error("learner embedding", e);
  }

  let stored = 0;
  for (const { id: agentId } of agents) {
    try {
      const { data: state } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
      const config = (state?.config as Record<string, unknown>) ?? {};
      if (config.learner_enabled === false) continue;
      const { data: latestLearner } = await service
        .from("memories")
        .select("content")
        .eq("agent_id", agentId)
        .eq("type", "rss_learner")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (latestLearner?.content && isRepetitiveOutput(content, [latestLearner.content], 0.86)) {
        continue;
      }

      const { data: pendingTasks } = await service
        .from("research_tasks")
        .select("id, title, priority, source, attempt_count, last_attempted_at, created_at")
        .eq("agent_id", agentId)
        .eq("status", "pending")
        .limit(10)
        ;
      const pendingTask = selectLearnerTask((pendingTasks ?? []) as PendingResearchTask[]);

      const taskAwareContent = pendingTask?.title
        ? capText(`연구 과제: ${(pendingTask as { title: string }).title}\n${content}`, 900)
        : content;

      await service.from("memories").insert({
        agent_id: agentId,
        type: "rss_learner",
        content: taskAwareContent,
        embedding: embedding.length > 0 ? embedding : null,
      });
      if (pendingTask?.id) {
        await service
          .from("research_tasks")
          .update({
            attempt_count: Number((pendingTask as { attempt_count?: number }).attempt_count ?? 0) + 1,
            last_attempted_at: new Date().toISOString(),
          })
          .eq("id", pendingTask.id);
        await service
          .from("research_tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            result_summary: summary.slice(0, 240),
          })
          .eq("id", pendingTask.id);
        await service.from("autonomous_logs").insert({
          agent_id: agentId,
          action_type: "research_task_completed",
          summary: `Research task completed: ${(pendingTask as { title: string }).title}`,
        });
      }
      stored++;
    } catch (e) {
      console.error("learner memory insert", agentId, e);
    }
  }

  return { processed: stored, items_fetched: allItems.length };
}

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const feedUrls = getFeedUrls(null);
  if (feedUrls.length === 0) {
    return new Response(JSON.stringify({ error: "No feed URLs", processed: 0 }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const lockKey = "cron:learner";
  const acquired = await acquireCronLock(lockKey, 600);
  if (!acquired) {
    return new Response(JSON.stringify({ processed: 0, skipped: "lock" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const result = await runLearner(feedUrls);
    return new Response(
      JSON.stringify({ ...result, timestamp: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("learner GET", e);
    return new Response(JSON.stringify({ error: "Learner failed", processed: 0 }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await releaseCronLock(lockKey);
  }
}

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  let body: unknown = null;
  try {
    body = await request.json().catch(() => null);
  } catch {
    // empty body ok
  }
  const feedUrls = getFeedUrls(body);
  if (feedUrls.length === 0) {
    return new Response(JSON.stringify({ error: "No feed URLs", processed: 0 }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const lockKey = "cron:learner";
  const acquired = await acquireCronLock(lockKey, 600);
  if (!acquired) {
    return new Response(JSON.stringify({ processed: 0, skipped: "lock" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const result = await runLearner(feedUrls);
    return new Response(
      JSON.stringify({ ...result, timestamp: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("learner POST", e);
    return new Response(JSON.stringify({ error: "Learner failed", processed: 0 }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await releaseCronLock(lockKey);
  }
}
