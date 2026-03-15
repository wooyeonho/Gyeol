import cron from "node-cron";
import { EngineConfig } from "./config";
import { buildAuthHeaders } from "./auth";

type JobDef = {
  name: string;
  schedule: string;
  endpoint: string;
  timeoutMs: number;
};

const JOBS: JobDef[] = [
  { name: "health",     schedule: "*/30 * * * *",  endpoint: "/api/cron/health",     timeoutMs: 30_000  },
  { name: "lifeline",   schedule: "*/30 * * * *",  endpoint: "/api/cron/lifeline",   timeoutMs: 120_000 },
  { name: "heartbeat",  schedule: "0 */2 * * *",   endpoint: "/api/cron/heartbeat",  timeoutMs: 120_000 },
  { name: "timecapsule",schedule: "0 * * * *",     endpoint: "/api/cron/time-capsule",timeoutMs: 60_000  },
  { name: "social",     schedule: "0 */6 * * *",   endpoint: "/api/cron/social",     timeoutMs: 60_000  },
  { name: "learner",    schedule: "0 */6 * * *",   endpoint: "/api/cron/learner",    timeoutMs: 120_000 },
  { name: "crawl",      schedule: "0 */8 * * *",   endpoint: "/api/cron/crawl",      timeoutMs: 180_000 },
  { name: "dream",      schedule: "0 4 * * *",     endpoint: "/api/cron/dream",      timeoutMs: 60_000  },
  { name: "world",      schedule: "0 0 * * *",     endpoint: "/api/cron/world",      timeoutMs: 60_000  },
  { name: "retention",  schedule: "0 3 * * *",     endpoint: "/api/cron/retention",  timeoutMs: 60_000  },
  { name: "redemption", schedule: "0 10 * * *",    endpoint: "/api/cron/redemption", timeoutMs: 30_000  },
  { name: "war",       schedule: "0 * * * *",     endpoint: "/api/cron/war",       timeoutMs: 30_000  },
  { name: "recap",     schedule: "0 9 * * 0",     endpoint: "/api/cron/recap",     timeoutMs: 120_000 },
];

async function callEndpoint(config: EngineConfig, job: JobDef): Promise<void> {
  const url = `${config.appUrl}${job.endpoint}`;
  const headers = buildAuthHeaders(config.cronSecret, config.useHmacAuth);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), job.timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    const body = await res.text();
    if (res.ok) {
      console.log(`[${ts()}] ✓ ${job.name} (${res.status}): ${body.slice(0, 200)}`);
    } else {
      console.error(`[${ts()}] ✗ ${job.name} (${res.status}): ${body.slice(0, 300)}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${ts()}] ✗ ${job.name} failed: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
}

function ts(): string {
  return new Date().toISOString();
}

export function startScheduler(config: EngineConfig): void {
  console.log(`[${ts()}] OpenClaw scheduler starting`);
  console.log(`[${ts()}] Target: ${config.appUrl}`);
  console.log(`[${ts()}] Auth mode: ${config.useHmacAuth ? "HMAC-SHA256" : "Bearer token"}`);
  console.log(`[${ts()}] Jobs:`);

  for (const job of JOBS) {
    if (!cron.validate(job.schedule)) {
      console.error(`  Invalid cron: ${job.name} = "${job.schedule}"`);
      continue;
    }

    cron.schedule(job.schedule, () => {
      console.log(`[${ts()}] → Running ${job.name}`);
      callEndpoint(config, job).catch((err) =>
        console.error(`[${ts()}] ✗ ${job.name} unhandled:`, err)
      );
    });

    console.log(`  ${job.name.padEnd(12)} ${job.schedule}`);
  }

  console.log(`[${ts()}] Scheduler ready — ${JOBS.length} jobs registered`);
}

export async function runOnce(config: EngineConfig, jobName?: string): Promise<void> {
  const targets = jobName ? JOBS.filter((j) => j.name === jobName) : JOBS;
  if (targets.length === 0) {
    console.error(`Unknown job: ${jobName}. Available: ${JOBS.map((j) => j.name).join(", ")}`);
    return;
  }
  for (const job of targets) {
    console.log(`[${ts()}] Running ${job.name} once...`);
    await callEndpoint(config, job);
  }
}
