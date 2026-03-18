// Extracted learner logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { capText, isMeaningfulAutonomousOutput, isRepetitiveOutput } from "@/lib/autonomy/self-regulation";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { sortResearchTasks } from "@/lib/goals/task-utils";
import { planNextResearchStep } from "@/lib/goals/next-step-planner";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { getSeedUrlsForTask } from "@/lib/goals/source-routing";

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
  // YouTube channels (RSS, no API key needed)
  "https://www.youtube.com/feeds/videos.xml?channel_id=UCBR8-60-B28hp2BmDPdntcQ",  // YouTube Trending (tech)
  "https://www.youtube.com/feeds/videos.xml?channel_id=UCVHFbqXqoYvEWM1Ddxl0QDg",  // Android Authority
];

// RSS equivalents for source-routing categories
const INTEREST_FEEDS: Record<string, string[]> = {
  music: ["https://pitchfork.com/feed/feed-news/rss", "https://www.stereogum.com/feed/"],
  cooking: ["https://www.seriouseats.com/feeds/serious-eats", "https://minimalistbaker.com/feed/"],
  gaming: ["https://www.polygon.com/rss/index.xml"],
  science: ["https://www.nature.com/nature.rss", "https://www.sciencedaily.com/rss/all.xml"],
  health: ["https://www.health.harvard.edu/blog/feed"],
  film: ["https://www.indiewire.com/feed/"],
  finance: ["https://www.bloomberg.com/feed/podcast"],
  travel: ["https://nomadicmatt.com/feed/"],
  art: ["https://www.thisiscolossal.com/feed/"],
  philosophy: ["https://aeon.co/feed.rss"],
};

async function getPersonalizedFeeds(agentId: string, baseFeedUrls: string[]): Promise<string[]> {
  const db = createServiceClient();
  const { data: state } = await db
    .from("agent_state")
    .select("config")
    .eq("agent_id", agentId)
    .single();

  if (!state) return baseFeedUrls;

  const config = (state.config as Record<string, unknown>) ?? {};
  const researchFocus = typeof config.research_focus === "string" ? config.research_focus : null;
  const activeGoal = typeof config.active_goal === "string" ? config.active_goal : null;

  // Get topic-matched URLs from source routing
  const topicUrls = getSeedUrlsForTask(researchFocus || activeGoal, []);

  // Get interest-based feeds from user conversation keywords
  const { data: recentChats } = await db
    .from("chats")
    .select("content")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(30);

  const chatText = (recentChats ?? []).map((c) => String((c as { content?: string }).content ?? "")).join(" ").toLowerCase();
  const interestFeeds: string[] = [];
  for (const [interest, feeds] of Object.entries(INTEREST_FEEDS)) {
    // Use escaped interest key to safely handle multi-word keys and special chars
    const escaped = interest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\s|\\b)${escaped}(?:\\s|\\b|$)`, "i");
    if (regex.test(chatText)) {
      interestFeeds.push(...feeds);
    }
  }

  // Combine: base feeds + topic URLs that look like RSS + interest feeds
  const rssLikeUrls = topicUrls.filter((u) => u.includes("/feed") || u.includes("/rss") || u.includes(".rss") || u.includes(".xml"));
  return [...new Set([...baseFeedUrls, ...rssLikeUrls, ...interestFeeds])].slice(0, 15);
}

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

export function getFeedUrls(body: unknown): string[] {
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

async function summarizeLearnerItems(rawText: string, language: string): Promise<string> {
  try {
    return await generateTextOnce(
      `You are a knowledge summarizer. Write in ${language}.`,
      `Summarize these RSS headlines into 2-3 key insights for an AI agent to learn:\n\n${rawText}\n\nOutput: concise insights only.`,
      { max_tokens: 300, temperature: 0.5 }
    );
  } catch (e) {
    console.error("learner summary", e);
    return rawText.slice(0, 500);
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

  const baseRawText = allItems.slice(0, 10).map((i) => `[${i.source}] ${i.title}: ${(i.description ?? "").slice(0, 200)}`).join("\n\n");
  const summaryCache = new Map<string, string>();
  const contentCache = new Map<string, { content: string; embedding: number[] }>();

  let stored = 0;
  for (const { id: agentId } of agents) {
    try {
      // Personalize feeds per agent based on interests and goals
      const personalizedUrls = await getPersonalizedFeeds(agentId, feedUrls);
      const agentExtraItems: { title: string; link?: string; description?: string; source: string }[] = [];
      for (const url of personalizedUrls) {
        if (!feedUrls.includes(url)) {
          const items = await fetchRssItems(url);
          const source = new URL(url).hostname;
          for (const it of items) {
            agentExtraItems.push({ ...it, source });
          }
        }
      }

      // Build per-agent rawText: base items + personalized items
      let rawText = baseRawText;
      if (agentExtraItems.length > 0) {
        const extraText = agentExtraItems.slice(0, 5).map((i) => `[${i.source}] ${i.title}: ${(i.description ?? "").slice(0, 200)}`).join("\n\n");
        rawText = `${baseRawText}\n\n${extraText}`;
      }

      const { data: state } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
      const config = (state?.config as Record<string, unknown>) ?? {};
      if (config.learner_enabled === false) continue;
      const locale = resolveGenerationLocale({ config });
      const language = getLanguageName(locale);

      // Use per-agent cache key when personalized feeds differ
      const cacheKey = agentExtraItems.length > 0 ? `${locale}:${agentId}` : locale;
      let summary = summaryCache.get(cacheKey);
      if (!summary) {
        summary = await summarizeLearnerItems(rawText, language);
        summaryCache.set(cacheKey, summary);
      }
      let cachedContent = contentCache.get(cacheKey);
      if (!cachedContent) {
        const content = capText(`${locale === "ko" ? "RSS \ud559\uc2b5" : "RSS learning"}: ${summary}`, 900);
        let embedding: number[] = [];
        try {
          embedding = await generateEmbedding(content);
        } catch (e) {
          console.error("learner embedding", e);
        }
        cachedContent = { content, embedding };
        contentCache.set(cacheKey, cachedContent);
      }
      const { content, embedding } = cachedContent;
      if (!isMeaningfulAutonomousOutput(content)) {
        continue;
      }
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
        ? capText(`${locale === "ko" ? "\uc5f0\uad6c \uacfc\uc81c" : "Research task"}: ${(pendingTask as { title: string }).title}\n${content}`, 900)
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

        const { data: stateRow } = await service
          .from("agent_state")
          .select("config, self_model")
          .eq("agent_id", agentId)
          .single();
        const stateConfig = ((stateRow as { config?: Record<string, unknown> } | null)?.config ?? {}) as Record<string, unknown>;
        const selfModel = ((stateRow as { self_model?: Record<string, unknown> } | null)?.self_model ?? {}) as Record<string, unknown>;
        const plan = await planNextResearchStep({
          activeGoal: typeof stateConfig.active_goal === "string" ? stateConfig.active_goal : null,
          completedTask: (pendingTask as { title: string }).title,
          config: stateConfig,
          resultSummary: summary,
        });

        const nextConfig = {
          ...stateConfig,
          active_goal: typeof plan?.active_goal === "string" ? plan.active_goal : stateConfig.active_goal,
          long_term_goal: typeof plan?.long_term_goal === "string" ? plan.long_term_goal : stateConfig.long_term_goal,
          research_focus: typeof plan?.next_task === "string" ? plan.next_task : stateConfig.research_focus,
          goal_updated_at: new Date().toISOString(),
        };
        const observations = Array.isArray(selfModel.observations) ? selfModel.observations : [];
        const roleHistory = Array.isArray((selfModel as { role_history?: string[] }).role_history)
          ? ((selfModel as { role_history?: string[] }).role_history as string[])
          : [];

        await service
          .from("agent_state")
          .update({
            config: nextConfig,
            self_model: {
              ...selfModel,
              current_role: typeof plan?.role_shift === "string" ? plan.role_shift : (selfModel as { current_role?: string }).current_role,
              identity_statement: typeof plan?.identity_statement === "string"
                ? plan.identity_statement
                : (selfModel as { identity_statement?: string }).identity_statement,
              observations: typeof plan?.self_observation === "string"
                ? [...observations.slice(-7), plan.self_observation]
                : observations,
              role_history: typeof plan?.role_shift === "string"
                ? [...roleHistory.slice(-4), plan.role_shift]
                : roleHistory,
            },
          })
          .eq("agent_id", agentId);

        if (typeof plan?.next_task === "string") {
          await service.from("research_tasks").insert({
            agent_id: agentId,
            parent_task_id: pendingTask.id,
            priority: plan.priority ?? 2,
            source: "planner",
            status: "pending",
            title: plan.next_task,
          });
        }
      }
      stored++;
    } catch (e) {
      console.error("learner memory insert", agentId, e);
    }
  }

  return { processed: stored, items_fetched: allItems.length };
}

export async function executeLearner(body?: unknown): Promise<CronResult> {
  const feedUrls = getFeedUrls(body ?? null);
  if (feedUrls.length === 0) {
    return { processed: 0, timestamp: new Date().toISOString(), error: "No feed URLs", statusCode: 400 };
  }
  const lockKey = "cron:learner";
  const acquired = await acquireCronLock(lockKey, 600);
  if (!acquired) {
    return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };
  }
  try {
    const result = await runLearner(feedUrls);
    return { ...result, timestamp: new Date().toISOString() };
  } catch (e) {
    console.error("learner execute", e);
    return { processed: 0, timestamp: new Date().toISOString(), error: "Learner failed" };
  } finally {
    await releaseCronLock(lockKey);
  }
}
