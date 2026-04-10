import * as cheerio from "cheerio";
import { EngineConfig } from "./config";
import { buildAuthHeaders } from "./auth";
import { logger } from "../../lib/logger";

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  meta?: { description?: string; keywords?: string };
}

const BLOCKED_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg|webp|mp4|mp3|pdf|zip|tar|gz|exe|dmg|iso)$/i;
const MAX_CONTENT_LENGTH = 5000;

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "::1" || host.endsWith(".local")) return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.)/.test(host)) return false;
    if (BLOCKED_EXTENSIONS.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function resolveUrl(base: string, href: string): string | null {
  try {
    const resolved = new URL(href, base).toString();
    return isValidUrl(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function extractText($: cheerio.CheerioAPI): string {
  $("script, style, nav, footer, header, iframe, noscript, svg").remove();

  const article = $("article").first();
  const main = $("main").first();
  const target = article.length ? article : main.length ? main : $("body");

  const text = target
    .text()
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, MAX_CONTENT_LENGTH);
}

export async function crawlPage(url: string): Promise<CrawlResult | null> {
  if (!isValidUrl(url)) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "GYEOL-Crawler/1.0 (+https://github.com/gyeol)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("xhtml")) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $("meta[property='og:title']").attr("content") ||
      $("title").text().trim() ||
      url;

    const description =
      $("meta[property='og:description']").attr("content") ||
      $("meta[name='description']").attr("content") ||
      "";

    const keywords = $("meta[name='keywords']").attr("content") || "";

    const content = extractText($);

    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const resolved = resolveUrl(url, href);
      if (resolved && !links.includes(resolved)) links.push(resolved);
    });

    return {
      url,
      title: title.slice(0, 200),
      content,
      links: links.slice(0, 50),
      meta: { description: description.slice(0, 300), keywords: keywords.slice(0, 200) },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[Crawler] Failed ${url}: ${msg}`);
    return null;
  }
}

export async function crawlSite(
  startUrl: string,
  maxPages: number,
  maxDepth: number
): Promise<CrawlResult[]> {
  const visited = new Set<string>();
  const results: CrawlResult[] = [];

  interface QueueItem {
    url: string;
    depth: number;
  }
  const queue: QueueItem[] = [{ url: startUrl, depth: 0 }];

  let startDomain: string;
  try {
    startDomain = new URL(startUrl).hostname;
  } catch {
    return results;
  }

  while (queue.length > 0 && results.length < maxPages) {
    const item = queue.shift()!;
    if (visited.has(item.url)) continue;
    visited.add(item.url);

    const page = await crawlPage(item.url);
    if (!page) continue;

    results.push(page);

    if (item.depth < maxDepth) {
      for (const link of page.links) {
        try {
          if (new URL(link).hostname === startDomain && !visited.has(link)) {
            queue.push({ url: link, depth: item.depth + 1 });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`[Crawler] Skip invalid discovered link ${link}: ${msg}`);
        }
      }
    }
  }

  return results;
}

export async function submitCrawlResults(
  config: EngineConfig,
  results: CrawlResult[]
): Promise<void> {
  if (results.length === 0) return;

  const url = `${config.appUrl}/api/cron/crawl`;
  const headers = buildAuthHeaders(config.cronSecret, config.useHmacAuth);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ pages: results }),
    });
    const body = await res.text();
    logger.info(`[Crawler] Submit ${results.length} pages → ${res.status}: ${body.slice(0, 200)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[Crawler] Submit failed: ${msg}`);
  }
}

export async function runCrawlCycle(config: EngineConfig): Promise<void> {
  if (config.crawlUrls.length === 0) {
    logger.info("[Crawler] No CRAWL_URLS configured, skipping");
    return;
  }

  logger.info(`[Crawler] Starting cycle — ${config.crawlUrls.length} seed URLs, max ${config.crawlMaxPages} pages, depth ${config.crawlDepth}`);

  const allResults: CrawlResult[] = [];
  for (const seedUrl of config.crawlUrls) {
    const results = await crawlSite(seedUrl, config.crawlMaxPages, config.crawlDepth);
    allResults.push(...results);
  }

  logger.info(`[Crawler] Crawled ${allResults.length} pages total`);

  if (allResults.length > 0) {
    await submitCrawlResults(config, allResults);
  }
}
