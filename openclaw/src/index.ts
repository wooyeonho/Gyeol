/**
 * GYEOL × OpenClaw Gateway Entry Point
 *
 * Starts the OpenClaw gateway with Gyeol's cron plugin.
 * The gateway provides:
 *   - Built-in cron scheduler (replaces custom node-cron)
 *   - Agent heartbeat system
 *   - Health check endpoints
 *   - Retry/backoff for failed jobs
 *   - Persistent job storage across restarts
 *
 * Modes:
 *   node dist/openclaw/src/index.js            → Start gateway (default)
 *   node dist/openclaw/src/index.js run-once   → Run all jobs once and exit
 *   node dist/openclaw/src/index.js run-once <job>  → Run specific job
 *   node dist/openclaw/src/index.js crawl      → Run crawl cycle only
 */

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

import crypto from "crypto";
import { runCrawlCycle } from "./crawler";

// ── Lifeline (HTTP watchdog) ─────────────────────────────
function buildAuthHeaders(cronSecret: string, useHmac: boolean): Record<string, string> {
  if (!useHmac) {
    return { Authorization: `Bearer ${cronSecret}` };
  }
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac("sha256", cronSecret).update(timestamp).digest("hex");
  return { "X-Cron-Timestamp": timestamp, "X-Cron-Signature": signature };
}

async function executeLifeline(): Promise<unknown> {
  const appUrl = (process.env.GYEOL_APP_URL || "").replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET || "";
  const useHmac = process.env.USE_HMAC_AUTH === "true";
  if (!appUrl || !cronSecret) return { ok: false, error: "Missing GYEOL_APP_URL or CRON_SECRET" };

  const url = `${appUrl}/api/cron/lifeline`;
  const headers = buildAuthHeaders(cronSecret, useHmac);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body: body.slice(0, 200) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// ── Job registry (shared with plugin.ts) ─────────────────
const JOBS: Record<string, () => Promise<unknown>> = {
  health: executeHealth,
  heartbeat: executeHeartbeat,
  timecapsule: executeTimeCapsule,
  social: executeSocial,
  learner: () => executeLearner(),
  crawl: executeCrawl,
  dream: executeDream,
  world: executeWorld,
  retention: executeRetention,
  redemption: executeRedemption,
  war: executeWar,
  recap: executeRecap,
  proactivepush: executeProactivePush,
  lifeline: executeLifeline,
};

function ts(): string {
  return new Date().toISOString();
}

async function runOnce(jobName?: string): Promise<void> {
  const targets = jobName ? { [jobName]: JOBS[jobName] } : JOBS;

  if (jobName && !JOBS[jobName]) {
    console.error(`Unknown job: ${jobName}. Available: ${Object.keys(JOBS).join(", ")}`);
    return;
  }

  for (const [name, execute] of Object.entries(targets)) {
    console.log(`[${ts()}] Running ${name} once...`);
    try {
      const result = await execute();
      console.log(`[${ts()}] OK ${name}: ${JSON.stringify(result).slice(0, 200)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${ts()}] FAIL ${name}: ${msg}`);
    }
  }
}

// ── CLI Entrypoint ────────────────────────────────────────
const mode = process.argv[2];

if (mode === "run-once") {
  const jobName = process.argv[3];
  runOnce(jobName)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else if (mode === "crawl") {
  // Legacy crawl mode
  const config = {
    appUrl: (process.env.GYEOL_APP_URL || "").replace(/\/$/, ""),
    cronSecret: process.env.CRON_SECRET || "",
    port: parseInt(process.env.PORT || "8000", 10),
    crawlUrls: (process.env.CRAWL_URLS || "").split(",").map((u: string) => u.trim()).filter(Boolean),
    crawlMaxPages: parseInt(process.env.CRAWL_MAX_PAGES || "10", 10),
    crawlDepth: parseInt(process.env.CRAWL_DEPTH || "1", 10),
    useHmacAuth: process.env.USE_HMAC_AUTH === "true",
  };
  runCrawlCycle(config)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  // Default: start OpenClaw gateway
  console.log(`[${ts()}] Starting GYEOL × OpenClaw gateway...`);
  console.log(`[${ts()}] OpenClaw gateway will load config from openclaw.json5`);
  console.log(`[${ts()}] Gyeol plugin registers ${Object.keys(JOBS).length} cron jobs`);

  const { spawn } = require("child_process");
  const port = process.env.PORT || "8000";

  const gatewayProcess = spawn(
    "npx",
    ["openclaw", "gateway", "--port", port, "--verbose"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        OPENCLAW_CONFIG: "./openclaw.json5",
        OPENCLAW_HOME: process.cwd(),
      },
    }
  );

  gatewayProcess.on("error", (err: Error) => {
    console.error(`[${ts()}] Gateway failed to start:`, err.message);
    process.exit(1);
  });

  gatewayProcess.on("exit", (code: number | null) => {
    console.log(`[${ts()}] Gateway exited with code ${code}`);
    process.exit(code || 0);
  });

  // Graceful shutdown
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      console.log(`[${ts()}] Received ${signal}, shutting down gateway...`);
      gatewayProcess.kill(signal);
    });
  }
}
