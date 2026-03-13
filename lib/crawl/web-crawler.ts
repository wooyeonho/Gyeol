import * as cheerio from "cheerio";
import { logWarn } from "@/lib/ops/logger";

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  links: string[];
  meta?: { description?: string; keywords?: string };
}

const BLOCKED_EXT = /\.(jpg|jpeg|png|gif|svg|webp|mp4|mp3|pdf|zip|tar|gz|exe|dmg|iso|woff|woff2|ttf|eot)$/i;
const MAX_TEXT = 5000;
const FETCH_TIMEOUT = 15_000;

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "::1" || h.endsWith(".local")) return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.)/.test(h)) return false;
    if (BLOCKED_EXT.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function resolveLink(base: string, href: string): string | null {
  try {
    const resolved = new URL(href, base).toString();
    return isAllowedUrl(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function extractText($: cheerio.CheerioAPI): string {
  $("script, style, nav, footer, header, iframe, noscript, svg, aside").remove();
  const article = $("article").first();
  const main = $("main").first();
  const target = article.length ? article : main.length ? main : $("body");
  return target.text().replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

export async function crawlPage(url: string): Promise<CrawledPage | null> {
  if (!isAllowedUrl(url)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
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
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("xhtml")) return null;

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
      const resolved = resolveLink(url, href);
      if (resolved && !links.includes(resolved)) links.push(resolved);
    });

    return {
      url,
      title: title.slice(0, 200),
      content,
      links: links.slice(0, 50),
      meta: {
        description: description.slice(0, 300),
        keywords: keywords.slice(0, 200),
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function crawlSite(
  seedUrl: string,
  maxPages = 10,
  maxDepth = 1
): Promise<CrawledPage[]> {
  const visited = new Set<string>();
  const results: CrawledPage[] = [];
  const queue: { url: string; depth: number }[] = [{ url: seedUrl, depth: 0 }];

  let domain: string;
  try {
    domain = new URL(seedUrl).hostname;
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
          if (new URL(link).hostname === domain && !visited.has(link)) {
            queue.push({ url: link, depth: item.depth + 1 });
          }
        } catch (error) {
          logWarn("Crawler skipped invalid discovered link", {
            link,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  return results;
}
