import cron from "node-cron";
import { EngineConfig } from "./config";
import { buildAuthHeaders } from "./auth";

// Direct execution imports from lib/cron-core
import {
  executeHeartbeat,
  executeDream,
  executeSocial,
  executeHealth,
  executeLearner,
  executeCrawl,
  executeRetention,
  executeWorld,
  executeTimeCapsule,
  executeRecap,
  executeRedemption,
  executeWar,
  executeProactivePush,
} from "../../lib/cron-core";

type DirectJob = {
  name: string;
  schedule: string;
  execute: () => Promise<unknown>;
};

type HttpJob = {
  name: string;
  schedule: string;
  endpoint: string;
  timeoutMs: number;
};

const DIRECT_JOBS: DirectJob[] = [
  { name: "health",       schedule: "*/30 * * * *",  execute: executeHealth },
  { name: "heartbeat",    schedule: "0 */2 * * *",   execute: executeHeartbeat },
  { name: "timecapsule",  schedule: "0 * * * *",     execute: executeTimeCapsule },
  { name: "social",       schedule: "0 */6 * * *",   execute: executeSocial },
  { name: "learner",      schedule: "0 */6 * * *",   execute: () => executeLearner() },
  { name: "crawl",        schedule: "0 */8 * * *",   execute: executeCrawl },
  { name: "dream",        schedule: "0 4 * * *",     execute: executeDream },
  { name: "world",        schedule: "0 0 * * *",     execute: executeWorld },
  { name: "retention",    schedule: "0 3 * * *",     execute: executeRetention },
  { name: "redemption",   schedule: "0 10 * * *",    execute: executeRedemption },
  { name: "war",          schedule: "0 * * * *",     execute: executeWar },
  { name: "recap",        schedule: "0 9 * * 0",     execute: executeRecap },
  { name: "proactivepush",schedule: "0 18 * * *",    execute: executeProactivePush },
];

// Lifeline stays as HTTP — it's a watchdog that must test the HTTP path
const HTTP_JOBS: HttpJob[] = [
  { name: "lifeline", schedule: "*/30 * * * *", endpoint: "/api/cron/lifeline", timeoutMs: 120_000 },
];

async function runDirectJob(job: DirectJob): Promise<void> {
  try {
    const result = await job.execute();
    console.log(`[${ts()}] OK ${job.name}: ${JSON.stringify(result).slice(0, 200)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${ts()}] FAIL ${job.name}: ${msg}`);
  }
}

async function callEndpoint(config: EngineConfig, job: HttpJob): Promise<void> {
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
      console.log(`[${ts()}] OK ${job.name} (${res.status}): ${body.slice(0, 200)}`);
    } else {
      console.error(`[${ts()}] FAIL ${job.name} (${res.status}): ${body.slice(0, 300)}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${ts()}] FAIL ${job.name}: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
}

function ts(): string {
  return new Date().toISOString();
}

export function startScheduler(config: EngineConfig): void {
  console.log(`[${ts()}] OpenClaw scheduler starting (direct execution mode)`);
  console.log(`[${ts()}] Target (HTTP fallback): ${config.appUrl}`);
  console.log(`[${ts()}] Auth mode: ${config.useHmacAuth ? "HMAC-SHA256" : "Bearer token"}`);

  // Run critical jobs shortly after startup so a Koyeb restart
  // doesn't leave agents without heartbeat/crawl until the next
  // cron window (which could be hours away).
  const STARTUP_CRITICAL_JOBS = ["health", "heartbeat"];
  const STARTUP_DELAY_MS = 30_000; // 30 seconds — let DB connections settle
  setTimeout(() => {
    console.log(`[${ts()}] Running startup catch-up for critical jobs`);
    for (const jobName of STARTUP_CRITICAL_JOBS) {
      const job = DIRECT_JOBS.find((j) => j.name === jobName);
      if (job) {
        runDirectJob(job).catch((err) =>
          console.error(`[${ts()}] FAIL startup ${job.name}:`, err)
        );
      }
    }
  }, STARTUP_DELAY_MS);

  console.log(`[${ts()}] Direct jobs:`);

  for (const job of DIRECT_JOBS) {
    if (!cron.validate(job.schedule)) {
      console.error(`  Invalid cron: ${job.name} = "${job.schedule}"`);
      continue;
    }
    cron.schedule(job.schedule, () => {
      console.log(`[${ts()}] -> Running ${job.name} (direct)`);
      runDirectJob(job).catch((err) =>
        console.error(`[${ts()}] FAIL ${job.name} unhandled:`, err)
      );
    });
    console.log(`  ${job.name.padEnd(16)} ${job.schedule} (direct)`);
  }

  console.log(`[${ts()}] HTTP jobs:`);
  for (const job of HTTP_JOBS) {
    if (!cron.validate(job.schedule)) {
      console.error(`  Invalid cron: ${job.name} = "${job.schedule}"`);
      continue;
    }
    cron.schedule(job.schedule, () => {
      console.log(`[${ts()}] -> Running ${job.name} (HTTP)`);
      callEndpoint(config, job).catch((err) =>
        console.error(`[${ts()}] FAIL ${job.name} unhandled:`, err)
      );
    });
    console.log(`  ${job.name.padEnd(16)} ${job.schedule} (HTTP)`);
  }

  const total = DIRECT_JOBS.length + HTTP_JOBS.length;
  console.log(`[${ts()}] Scheduler ready — ${DIRECT_JOBS.length} direct + ${HTTP_JOBS.length} HTTP = ${total} jobs`);
  console.log(`[${ts()}] Startup catch-up for [${STARTUP_CRITICAL_JOBS.join(", ")}] in ${STARTUP_DELAY_MS / 1000}s`);
}

export async function runOnce(config: EngineConfig, jobName?: string): Promise<void> {
  // Try direct jobs first
  const directTarget = jobName ? DIRECT_JOBS.filter((j) => j.name === jobName) : DIRECT_JOBS;
  const httpTarget = jobName ? HTTP_JOBS.filter((j) => j.name === jobName) : HTTP_JOBS;

  if (jobName && directTarget.length === 0 && httpTarget.length === 0) {
    const all = [...DIRECT_JOBS, ...HTTP_JOBS].map((j) => j.name);
    console.error(`Unknown job: ${jobName}. Available: ${all.join(", ")}`);
    return;
  }

  for (const job of directTarget) {
    console.log(`[${ts()}] Running ${job.name} once (direct)...`);
    await runDirectJob(job);
  }
  for (const job of httpTarget) {
    console.log(`[${ts()}] Running ${job.name} once (HTTP)...`);
    await callEndpoint(config, job);
  }
}
