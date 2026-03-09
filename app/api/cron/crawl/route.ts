import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkCronAuth } from "@/lib/cron-auth";
import { generateTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { crawlSite, type CrawledPage } from "@/lib/crawl/web-crawler";
import {
  capText,
  isMeaningfulAutonomousOutput,
  isRepetitiveOutput,
} from "@/lib/autonomy/self-regulation";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

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

async function summarizePages(pages: CrawledPage[]): Promise<string> {
  const raw = pages
    .map((p) => `[${p.title}] ${p.content.slice(0, 400)}`)
    .join("\n\n")
    .slice(0, 3000);

  try {
    return await generateTextOnce(
      "You are a knowledge summarizer for an AI being. Output in Korean.",
      `Summarize these web pages into 3-5 key insights:\n\n${raw}\n\nConcise insights only.`,
      { max_tokens: 400, temperature: 0.5 }
    );
  } catch {
    return raw.slice(0, 600);
  }
}

async function processPages(pages: CrawledPage[]): Promise<{
  stored: number;
  agents_updated: number;
}> {
  if (pages.length === 0) return { stored: 0, agents_updated: 0 };

  const service = createServiceClient();
  const summary = await summarizePages(pages);
  const content = capText(`웹 학습: ${summary}`, 900);

  if (!isMeaningfulAutonomousOutput(content)) {
    return { stored: 0, agents_updated: 0 };
  }

  let embedding: number[] = [];
  try {
    embedding = await generateEmbedding(content);
  } catch {}

  const { data: agents } = await service.from("agents").select("id");
  if (!agents?.length) return { stored: 0, agents_updated: 0 };

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

      await service.from("memories").insert({
        agent_id: agentId,
        type: "web_crawl",
        content,
        embedding: embedding.length > 0 ? embedding : null,
      });
      stored++;
    } catch (err) {
      console.error("[Crawl] memory insert", agentId, err);
    }
  }

  return { stored, agents_updated: stored };
}

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lockKey = "cron:crawl";
  const acquired = await acquireCronLock(lockKey, 900);
  if (!acquired) {
    return new Response(JSON.stringify({ processed: 0, skipped: "lock" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const urls = getCrawlUrls();
    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "No CRAWL_URLS configured", processed: 0 }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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

    const result = await processPages(allPages);

    return new Response(
      JSON.stringify({
        ...result,
        pages_crawled: allPages.length,
        seed_urls: urls.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Crawl] GET error", err);
    return new Response(
      JSON.stringify({ error: "Crawl failed", processed: 0 }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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

  const lockKey = "cron:crawl";
  const acquired = await acquireCronLock(lockKey, 900);
  if (!acquired) {
    return new Response(JSON.stringify({ processed: 0, skipped: "lock" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      pages?: CrawledPage[];
      urls?: string[];
    } | null;

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
          } catch {}
        }
      }
    }

    if (pages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No pages to process", processed: 0 }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await processPages(pages);

    return new Response(
      JSON.stringify({
        ...result,
        pages_processed: pages.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Crawl] POST error", err);
    return new Response(
      JSON.stringify({ error: "Crawl processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await releaseCronLock(lockKey);
  }
}
