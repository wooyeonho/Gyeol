import { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeCrawl, executeCrawlWithBody } from "@/lib/cron-core";
import type { CrawledPage } from "@/lib/crawl/web-crawler";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const result = await executeCrawl();
  return new Response(JSON.stringify(result), {
    status: result.statusCode ?? (result.error ? 500 : 200),
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const body = (await request.json().catch(() => null)) as {
    pages?: CrawledPage[];
    urls?: string[];
  } | null;
  const result = await executeCrawlWithBody(body);
  return new Response(JSON.stringify(result), {
    status: result.statusCode ?? (result.error ? 500 : 200),
    headers: { "Content-Type": "application/json" },
  });
}
