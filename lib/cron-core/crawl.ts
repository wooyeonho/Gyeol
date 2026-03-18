// Extracted crawl logic — pure TypeScript, zero Next.js dependencies.

import type { CronResult } from "./types";
import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { crawlSite, type CrawledPage } from "@/lib/crawl/web-crawler";
import {
  capText,
  isMeaningfulAutonomousOutput,
  isRepetitiveOutput,
} from "@/lib/autonomy/self-regulation";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { extractTaskKeywords, sortResearchTasks } from "@/lib/goals/task-utils";
import { planNextResearchStep } from "@/lib/goals/next-step-planner";
import { getSeedUrlsForTask } from "@/lib/goals/source-routing";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { logWarn } from "@/lib/ops/logger";

type PendingResearchTask = {
  id: string;
  title?: string | null;
  priority?: number | null;
  source?: string | null;
  attempt_count?: number | null;
  last_attempted_at?: string | null;
  created_at?: string | null;
};

function selectCrawlTask(
  tasks: PendingResearchTask[]
): PendingResearchTask | undefined {
  const preferred = tasks.filter((task) => {
    const source = String(task.source ?? "chat");
    return source === "heartbeat_crawl" || source === "crawl" || source === "chat";
  });
  const target = preferred.length > 0 ? preferred : tasks;
  return sortResearchTasks(target)[0];
}

const DEFAULT_CRAWL_URLS = [
  "https://news.ycombinator.com",
  "https://techcrunch.com",
];

function getCrawlUrls(): string[] {
  const env = process.env.CRAWL_URLS;
  if (env) {
    return env
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
  }
  return DEFAULT_CRAWL_URLS;
}

async function summarizePages(pages: CrawledPage[], language: string): Promise<string> {
  const raw = pages
    .map((p) => `[${p.title}] ${p.content.slice(0, 400)}`)
    .join("\n\n")
    .slice(0, 3000);

  try {
    return await generateTextOnce(
      `You are a knowledge summarizer for an AI being. Write in ${language}.`,
      `Summarize these web pages into 3-5 key insights:\n\n${raw}\n\nConcise insights only.`,
      { max_tokens: 400, temperature: 0.5 }
    );
  } catch {
    return raw.slice(0, 600);
  }
}

function filterPagesByTask(pages: CrawledPage[], taskTitle: string | null | undefined) {
  const keywords = extractTaskKeywords(taskTitle);
  if (keywords.length === 0) return pages;

  const scored = pages
    .map((page) => {
      const haystack = `${page.title} ${page.content}`.toLowerCase();
      const score = keywords.reduce((count, keyword) => (haystack.includes(keyword) ? count + 1 : count), 0);
      return { page, score };
    })
    .sort((a, b) => b.score - a.score);

  const matched = scored.filter((item) => item.score > 0).map((item) => item.page);
  return matched.length > 0 ? matched.slice(0, 6) : pages;
}

async function processPages(pages: CrawledPage[], fallbackUrls: string[]): Promise<{
  stored: number;
  agents_updated: number;
}> {
  if (pages.length === 0) return { stored: 0, agents_updated: 0 };

  const service = createServiceClient();
  const { data: agents } = await service.from("agents").select("id");
  if (!agents?.length) return { stored: 0, agents_updated: 0 };
  const summaryCache = new Map<string, string>();
  const contentCache = new Map<string, { content: string; embedding: number[] }>();

  let stored = 0;
  for (const { id: agentId } of agents) {
    try {
      const { data: state } = await service
        .from("agent_state")
        .select("config")
        .eq("agent_id", agentId)
        .single();
      const config = (state?.config as Record<string, unknown>) ?? {};
      if (config.crawl_enabled === false) continue;
      const locale = resolveGenerationLocale({ config });
      const language = getLanguageName(locale);
      let summary = summaryCache.get(locale);
      if (!summary) {
        summary = await summarizePages(pages, language);
        summaryCache.set(locale, summary);
      }
      let cachedContent = contentCache.get(locale);
      if (!cachedContent) {
        const content = capText(`${locale === "ko" ? "\uc6f9 \ud559\uc2b5" : "Web learning"}: ${summary}`, 900);
        let embedding: number[] = [];
        try {
          embedding = await generateEmbedding(content);
        } catch (error) {
          logWarn("Crawl content embedding failed", {
            agentId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        cachedContent = { content, embedding };
        contentCache.set(locale, cachedContent);
      }
      const { content, embedding } = cachedContent;

      if (!isMeaningfulAutonomousOutput(content)) {
        continue;
      }

      const { data: latest } = await service
        .from("memories")
        .select("content")
        .eq("agent_id", agentId)
        .eq("type", "web_crawl")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latest?.content && isRepetitiveOutput(content, [latest.content], 0.84)) {
        continue;
      }

      const { data: pendingTasks } = await service
        .from("research_tasks")
        .select("id, title, priority, source, attempt_count, last_attempted_at, created_at")
        .eq("agent_id", agentId)
        .eq("status", "pending")
        .limit(10);
      const pendingTask = selectCrawlTask((pendingTasks ?? []) as PendingResearchTask[]);
      let agentPages = pages;
      if (pendingTask?.title) {
        const candidateUrls = getSeedUrlsForTask(pendingTask.title, fallbackUrls).slice(0, 2);
        const taskPages: CrawledPage[] = [];
        for (const url of candidateUrls) {
          try {
            const crawled = await crawlSite(url, 4, 1);
            taskPages.push(...crawled);
          } catch (error) {
            logWarn("Crawl task seed failed", {
              agentId,
              url,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (taskPages.length > 0) agentPages = taskPages;
      }
      const focusedPages = filterPagesByTask(agentPages, pendingTask?.title);
      const focusedSummary = pendingTask?.title ? await summarizePages(focusedPages, language) : summary;

      const taskAwareContent = pendingTask?.title
        ? capText(`${locale === "ko" ? "\uc870\uc0ac \uacfc\uc81c" : "Research task"}: ${(pendingTask as { title: string }).title}\n${locale === "ko" ? "\uc6f9 \uc694\uc57d" : "Web summary"}: ${focusedSummary}`, 900)
        : content;

      await service.from("memories").insert({
        agent_id: agentId,
        type: "web_crawl",
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
            result_summary: focusedSummary.slice(0, 240),
          })
          .eq("id", pendingTask.id);

        await service.from("autonomous_logs").insert({
          agent_id: agentId,
          action_type: "research_task_completed",
          summary: `Research task completed via crawl: ${(pendingTask as { title: string }).title}`,
        });

        const { data: refreshedState } = await service
          .from("agent_state")
          .select("config, self_model")
          .eq("agent_id", agentId)
          .single();
        const stateConfig = ((refreshedState as { config?: Record<string, unknown> } | null)?.config ?? {}) as Record<string, unknown>;
        const selfModel = ((refreshedState as { self_model?: Record<string, unknown> } | null)?.self_model ?? {}) as Record<string, unknown>;
        const plan = await planNextResearchStep({
          activeGoal: typeof stateConfig.active_goal === "string" ? stateConfig.active_goal : null,
          completedTask: (pendingTask as { title: string }).title,
          config: stateConfig,
          resultSummary: focusedSummary,
        });

        const observations = Array.isArray(selfModel.observations) ? selfModel.observations : [];
        const roleHistory = Array.isArray((selfModel as { role_history?: string[] }).role_history)
          ? ((selfModel as { role_history?: string[] }).role_history as string[])
          : [];
        await service
          .from("agent_state")
          .update({
            config: {
              ...stateConfig,
              active_goal: typeof plan?.active_goal === "string" ? plan.active_goal : stateConfig.active_goal,
              long_term_goal: typeof plan?.long_term_goal === "string" ? plan.long_term_goal : stateConfig.long_term_goal,
              research_focus: typeof plan?.next_task === "string" ? plan.next_task : stateConfig.research_focus,
              goal_updated_at: new Date().toISOString(),
            },
            self_model: {
              ...selfModel,
              current_role: typeof plan?.role_shift === "string" ? plan.role_shift : (selfModel as { current_role?: string }).current_role,
              identity_statement: typeof plan?.identity_statement === "string"
                ? plan.identity_statement
                : (selfModel as { identity_statement?: string }).identity_statement,
              observations: typeof plan?.self_observation === "string"
                ? [...observations.slice(-6), `Researched and synthesized: ${(pendingTask as { title: string }).title}`, plan.self_observation]
                : [...observations.slice(-7), `Researched and synthesized: ${(pendingTask as { title: string }).title}`],
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
    } catch (err) {
      console.error("[Crawl] memory insert", agentId, err);
    }
  }

  return { stored, agents_updated: stored };
}

/** Execute crawl with default (env/config) URLs. */
export async function executeCrawl(): Promise<CronResult> {
  const lockKey = "cron:crawl";
  const acquired = await acquireCronLock(lockKey, 900);
  if (!acquired) {
    return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };
  }

  try {
    const urls = getCrawlUrls();
    if (urls.length === 0) {
      return { processed: 0, timestamp: new Date().toISOString(), error: "No CRAWL_URLS configured", statusCode: 400 };
    }

    const maxPages = parseInt(process.env.CRAWL_MAX_PAGES || "10", 10);
    const depth = parseInt(process.env.CRAWL_DEPTH || "1", 10);

    const allPages: CrawledPage[] = [];
    for (const seedUrl of urls) {
      try {
        const pages = await crawlSite(seedUrl, maxPages, depth);
        allPages.push(...pages);
      } catch (err) {
        console.error("[Crawl] site error", seedUrl, err);
      }
    }

    const result = await processPages(allPages, urls);

    return {
      ...result,
      processed: result.stored,
      pages_crawled: allPages.length,
      seed_urls: urls.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Crawl] execute error", err);
    return { processed: 0, timestamp: new Date().toISOString(), error: "Crawl failed" };
  } finally {
    await releaseCronLock(lockKey);
  }
}

/** Execute crawl with POST body (pages or urls). */
export async function executeCrawlWithBody(body: {
  pages?: CrawledPage[];
  urls?: string[];
} | null): Promise<CronResult> {
  const lockKey = "cron:crawl";
  const acquired = await acquireCronLock(lockKey, 900);
  if (!acquired) {
    return { processed: 0, timestamp: new Date().toISOString(), skipped: "lock" };
  }

  try {
    let pages: CrawledPage[] = [];

    if (body?.pages && Array.isArray(body.pages)) {
      pages = body.pages.filter(
        (p): p is CrawledPage =>
          typeof p.url === "string" &&
          typeof p.title === "string" &&
          typeof p.content === "string"
      );
    } else if (body?.urls && Array.isArray(body.urls)) {
      const maxPages = parseInt(process.env.CRAWL_MAX_PAGES || "10", 10);
      const depth = parseInt(process.env.CRAWL_DEPTH || "1", 10);
      for (const url of body.urls) {
        if (typeof url === "string") {
          try {
            const crawled = await crawlSite(url, maxPages, depth);
            pages.push(...crawled);
          } catch (error) {
            logWarn("Crawl POST URL failed", {
              url,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }

    if (pages.length === 0) {
      return { processed: 0, timestamp: new Date().toISOString(), error: "No pages to process", statusCode: 400 };
    }

    const fallbackUrls = body?.urls?.filter((item): item is string => typeof item === "string") ?? getCrawlUrls();
    const result = await processPages(pages, fallbackUrls);

    return {
      ...result,
      processed: result.stored,
      pages_processed: pages.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Crawl] POST execute error", err);
    return { processed: 0, timestamp: new Date().toISOString(), error: "Crawl processing failed" };
  } finally {
    await releaseCronLock(lockKey);
  }
}
