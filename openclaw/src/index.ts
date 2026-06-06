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

import http from "http";
import crypto from "crypto";

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

import { loadConfig, EngineConfig } from "./config";
import { runCrawlCycle } from "./crawler";
import { logger } from "../../lib/logger";

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
    logger.error(`Unknown job: ${jobName}. Available: ${Object.keys(JOBS).join(", ")}`);
    return;
  }

  for (const [name, execute] of Object.entries(targets)) {
    logger.info(`[${ts()}] Running ${name} once...`);
    try {
      const result = await execute();
      logger.info(`[${ts()}] OK ${name}: ${JSON.stringify(result).slice(0, 200)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[${ts()}] FAIL ${name}: ${msg}`);
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
      logger.error("run-once failed", err instanceof Error ? err : { error: String(err) });
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
      logger.error("crawl failed", err instanceof Error ? err : { error: String(err) });
      process.exit(1);
    });
} else {
  // Default: start server
  // Try OpenClaw gateway first; fall back to standalone HTTP + scheduler
  const config = loadConfig();

  // ── Standalone HTTP server (health check + manual crawl trigger) ──
  // This runs regardless of whether OpenClaw gateway starts,
  // providing the original /health and /crawl endpoints.
  const server = http.createServer((_req, res) => {
    const path = _req.url || "/";

    // Health check — no auth required (for Koyeb/platform probes)
    if (path === "/health" || path === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          service: "gyeol-openclaw",
          version: "3.0.0",
          uptime: process.uptime(),
          target: config.appUrl,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // Manual crawl trigger — requires auth
    if (path === "/crawl" && _req.method === "POST") {
      const auth = _req.headers.authorization?.replace("Bearer ", "");
      if (!auth || !timingSafeEqual(auth, config.cronSecret)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
      runCrawlCycle(config).catch((err) => logger.error("[Manual crawl]", err instanceof Error ? err : { error: String(err) }));
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "crawl_started" }));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(config.port, () => {
    logger.info(`[${ts()}] Health server on :${config.port}`);
    logger.info(`[${ts()}] Target: ${config.appUrl}`);
    logger.info(`[${ts()}] Auth mode: ${config.useHmacAuth ? "HMAC-SHA256" : "Bearer token"}`);
  });

  // ── Try starting OpenClaw gateway ──
  tryStartGateway(config);
}

// ── Timing-safe comparison (prevents timing attacks) ──
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ── OpenClaw Gateway launcher ──
function tryStartGateway(config: EngineConfig): void {
  logger.info(`[${ts()}] Attempting to start OpenClaw gateway...`);

  try {
    const { spawn } = await import("child_process");

    const gatewayProcess = spawn(
      "npx",
      ["openclaw", "gateway", "--port", String(config.port + 1), "--verbose", "--allow-unconfigured"],
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
      logger.warn(`[${ts()}] OpenClaw gateway not available: ${err.message}`);
      logger.info(`[${ts()}] Falling back to standalone scheduler...`);
      startFallbackScheduler(config);
    });

    gatewayProcess.on("exit", (code: number | null) => {
      if (code !== 0) {
        logger.warn(`[${ts()}] OpenClaw gateway exited with code ${code}`);
        logger.info(`[${ts()}] Falling back to standalone scheduler...`);
        startFallbackScheduler(config);
      }
    });

    // Graceful shutdown
    for (const signal of ["SIGTERM", "SIGINT"] as const) {
      process.on(signal, () => {
        logger.info(`[${ts()}] Received ${signal}, shutting down...`);
        gatewayProcess.kill(signal);
      });
    }
  } catch {
    logger.warn(`[${ts()}] OpenClaw not installed, using standalone scheduler`);
    startFallbackScheduler(config);
  }
}

// ── Fallback scheduler (when OpenClaw gateway is not available) ──
function startFallbackScheduler(_config: EngineConfig): void {
  logger.info(`[${ts()}] Starting fallback scheduler (no OpenClaw gateway)`);

  const { startScheduler } = await import("./scheduler");
  startScheduler(_config);
}
