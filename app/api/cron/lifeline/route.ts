import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { createServiceClient } from "@/lib/supabase/service";

type JobTarget = {
  name: string;
  endpoint: string;
  staleAfterMinutes: number;
};

const JOB_TARGETS: JobTarget[] = [
  { name: "heartbeat", endpoint: "/api/cron/heartbeat", staleAfterMinutes: 180 },
  { name: "time-capsule", endpoint: "/api/cron/time-capsule", staleAfterMinutes: 120 },
  { name: "social", endpoint: "/api/cron/social", staleAfterMinutes: 720 },
  { name: "learner", endpoint: "/api/cron/learner", staleAfterMinutes: 720 },
  { name: "crawl", endpoint: "/api/cron/crawl", staleAfterMinutes: 960 },
  { name: "dream", endpoint: "/api/cron/dream", staleAfterMinutes: 2160 },
  { name: "world", endpoint: "/api/cron/world", staleAfterMinutes: 1800 },
];

function getBaseUrl(req: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return req.nextUrl.origin;
}

async function runJob(baseUrl: string, secret: string, target: JobTarget): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(`${baseUrl}${target.endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, body: `fetch_error:${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const lockKey = "cron:lifeline";
  const acquired = await acquireCronLock(lockKey, 180);
  if (!acquired) return NextResponse.json({ processed: 0, skipped: "lock" });

  try {
    const db = createServiceClient();
    const baseUrl = getBaseUrl(req);
    const now = Date.now();

    let lockRows: Array<{ job_name: string; updated_at: string }> = [];
    try {
      const { data } = await db
        .from("cron_job_locks")
        .select("job_name, updated_at")
        .in("job_name", JOB_TARGETS.map((j) => `cron:${j.name}`));
      lockRows = (data ?? []) as Array<{ job_name: string; updated_at: string }>;
    } catch (e) {
      console.error("[Lifeline] lock table lookup failed", e);
      lockRows = [];
    }

    const updatedMap = new Map<string, string>();
    for (const row of lockRows) {
      updatedMap.set(String(row.job_name), String(row.updated_at));
    }

    const results: Array<{ job: string; action: "noop" | "triggered"; ok?: boolean; status?: number; detail?: string }> = [];
    let triggered = 0;

    for (const target of JOB_TARGETS) {
      const key = `cron:${target.name}`;
      const updatedAtRaw = updatedMap.get(key);
      const isStale = !updatedAtRaw || now - new Date(updatedAtRaw).getTime() > target.staleAfterMinutes * 60_000;
      if (!isStale) {
        results.push({ job: target.name, action: "noop", detail: "fresh" });
        continue;
      }

      const run = await runJob(baseUrl, secret, target);
      triggered++;
      results.push({
        job: target.name,
        action: "triggered",
        ok: run.ok,
        status: run.status,
        detail: run.body,
      });
    }

    return NextResponse.json({
      processed: results.length,
      triggered,
      timestamp: new Date().toISOString(),
      results,
    });
  } finally {
    await releaseCronLock(lockKey);
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
