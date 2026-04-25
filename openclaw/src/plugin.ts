/**
 * Gyeol Cron Plugin for OpenClaw
 *
 * Bridges Gyeol's existing cron-core business logic into the OpenClaw
 * gateway as native tools and a scheduled service.
 *
 * - Registers each cron-core executor as an OpenClaw agent tool
 * - Runs a background service that schedules jobs via croner
 * - Exposes an HTTP health route at /gyeol/health
 *
 * The existing lib/cron-core/ logic is preserved as-is — OpenClaw simply
 * provides the runtime (gateway, auth, heartbeat, retry, persistence).
 */

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
  executeOpenclawDna,
} from "../../lib/cron-core";

// ── Job Definitions ─────────────────────────────────────
interface GyeolJob {
  name: string;
  label: string;
  description: string;
  schedule: string;
  execute: () => Promise<unknown>;
  critical?: boolean;
}

const GYEOL_JOBS: GyeolJob[] = [
  {
    name: "gyeol_health",
    label: "Gyeol Health Check",
    description: "Check autonomy health scores for all Gyeol agents",
    schedule: "*/30 * * * *",
    execute: executeHealth,
    critical: true,
  },
  {
    name: "gyeol_heartbeat",
    label: "Gyeol Heartbeat",
    description: "Trigger autonomous heartbeat activity for Gyeol agents",
    schedule: "0 */2 * * *",
    execute: executeHeartbeat,
    critical: true,
  },
  {
    name: "gyeol_timecapsule",
    label: "Gyeol Time Capsule",
    description: "Generate time capsules for Gyeol agents",
    schedule: "0 * * * *",
    execute: executeTimeCapsule,
  },
  {
    name: "gyeol_social",
    label: "Gyeol Social",
    description: "Process AI-to-AI social interactions",
    schedule: "0 */6 * * *",
    execute: executeSocial,
  },
  {
    name: "gyeol_learner",
    label: "Gyeol Learner",
    description: "Learn from RSS feeds and consolidate agent memory",
    schedule: "0 */6 * * *",
    execute: () => executeLearner(),
  },
  {
    name: "gyeol_crawl",
    label: "Gyeol Web Crawl",
    description: "Crawl web pages for external knowledge",
    schedule: "0 */8 * * *",
    execute: executeCrawl,
  },
  {
    name: "gyeol_dream",
    label: "Gyeol Dream Engine",
    description: "Generate creative dream output for agents",
    schedule: "0 4 * * *",
    execute: executeDream,
  },
  {
    name: "gyeol_world",
    label: "Gyeol World Update",
    description: "Update world state for all agents",
    schedule: "0 0 * * *",
    execute: executeWorld,
  },
  {
    name: "gyeol_retention",
    label: "Gyeol Retention",
    description: "Process user retention metrics and re-engagement",
    schedule: "0 3 * * *",
    execute: executeRetention,
  },
  {
    name: "gyeol_redemption",
    label: "Gyeol Redemption",
    description: "Process pending coin redemption requests",
    schedule: "0 10 * * *",
    execute: executeRedemption,
  },
  {
    name: "gyeol_war",
    label: "Gyeol War Events",
    description: "Process competitive war events between agents",
    schedule: "0 * * * *",
    execute: executeWar,
  },
  {
    name: "gyeol_recap",
    label: "Gyeol Weekly Recap",
    description: "Generate weekly recap summaries",
    schedule: "0 9 * * 0",
    execute: executeRecap,
  },
  {
    name: "gyeol_proactive_push",
    label: "Gyeol Proactive Push",
    description: "Send proactive push notifications to users",
    schedule: "0 18 * * *",
    execute: executeProactivePush,
  },
  {
    name: "gyeol_openclaw",
    label: "Gyeol OpenClaw DNA Analyzer",
    description: "Batch-analyze interaction logs and apply weighted DNA axis mutations via LLM",
    schedule: "0 */4 * * *",
    execute: executeOpenclawDna,
  },
];

// ── Lifeline Watchdog (HTTP) ─────────────────────────────
// Lifeline stays as HTTP — it's a watchdog that must test the HTTP path
// to verify the Gyeol app (Vercel) is responding correctly.
const LIFELINE_SCHEDULE = "*/30 * * * *";
const LIFELINE_TIMEOUT_MS = 120_000;

function buildAuthHeaders(cronSecret: string, useHmac: boolean): Record<string, string> {
  if (!useHmac) {
    return { Authorization: `Bearer ${cronSecret}` };
  }
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", cronSecret)
    .update(timestamp)
    .digest("hex");
  return {
    "X-Cron-Timestamp": timestamp,
    "X-Cron-Signature": signature,
  };
}

async function executeLifeline(logger: { info: (msg: string) => void; error: (msg: string) => void }): Promise<{ ok: boolean; status?: number; body?: string }> {
  const appUrl = (process.env.GYEOL_APP_URL || "").replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET || "";
  const useHmac = process.env.USE_HMAC_AUTH === "true";

  if (!appUrl || !cronSecret) {
    logger.error("[Lifeline] Missing GYEOL_APP_URL or CRON_SECRET");
    return { ok: false };
  }

  const url = `${appUrl}/api/cron/lifeline`;
  const headers = buildAuthHeaders(cronSecret, useHmac);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIFELINE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    const body = await res.text();
    if (res.ok) {
      logger.info(`[${new Date().toISOString()}] OK lifeline (${res.status}): ${body.slice(0, 200)}`);
    } else {
      logger.error(`[${new Date().toISOString()}] FAIL lifeline (${res.status}): ${body.slice(0, 300)}`);
    }
    return { ok: res.ok, status: res.status, body: body.slice(0, 200) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[${new Date().toISOString()}] FAIL lifeline: ${msg}`);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

// ── Timestamp helper ────────────────────────────────────
function ts(): string {
  return new Date().toISOString();
}

// ── Run a single job with logging ───────────────────────
async function runJob(
  job: GyeolJob,
  logger: { info: (msg: string) => void; error: (msg: string) => void }
): Promise<unknown> {
  const start = Date.now();
  try {
    const result = await job.execute();
    const elapsed = Date.now() - start;
    logger.info(`[${ts()}] OK ${job.name} (${elapsed}ms): ${JSON.stringify(result).slice(0, 200)}`);
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[${ts()}] FAIL ${job.name} (${elapsed}ms): ${msg}`);
    throw err;
  }
}

// ── Plugin Registration ─────────────────────────────────
// OpenClaw loads this via the `plugins` config in openclaw.json5.
// Uses the function-style plugin module: (api) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function gyeolCronPlugin(api: any): void {
  const { logger } = api;

  logger.info(`[Gyeol] Registering ${GYEOL_JOBS.length} cron-core jobs as OpenClaw tools`);

  // 1. Register each job as an agent tool
  for (const job of GYEOL_JOBS) {
    api.registerTool({
      name: job.name,
      label: job.label,
      description: job.description,
      parameters: { type: "object" as const, properties: {} },
       
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      execute: async (_toolCallId: string, _params: unknown) => {
        const result = await runJob(job, logger);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          details: result,
        };
      },
    });
  }

  // 2. Register lifeline watchdog tool (HTTP — tests the Vercel app path)
  api.registerTool({
    name: "gyeol_lifeline",
    label: "Gyeol Lifeline Watchdog",
    description: "Test the Gyeol app HTTP endpoint to verify it is alive (watchdog)",
    parameters: { type: "object" as const, properties: {} },
     
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: async (_toolCallId: string, _params: unknown) => {
      const result = await executeLifeline(logger);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 3. Register a combined "run all" tool
  api.registerTool({
    name: "gyeol_run_all",
    label: "Gyeol Run All Jobs",
    description: "Run all Gyeol cron jobs sequentially (use for manual catch-up)",
    parameters: { type: "object" as const, properties: {} },
     
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: async (_toolCallId: string, _params: unknown) => {
      const results: Record<string, unknown> = {};
      for (const job of GYEOL_JOBS) {
        try {
          results[job.name] = await runJob(job, logger);
        } catch {
          results[job.name] = { error: "failed" };
        }
      }
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        details: results,
      };
    },
  });

  // 3. Register HTTP health route
  api.registerHttpRoute({
    path: "/gyeol/health",
    auth: "gateway" as const,
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (_req: any, res: any) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        service: "gyeol-openclaw",
        version: "3.0.0",
        uptime: process.uptime(),
        jobs: GYEOL_JOBS.map((j) => j.name),
        timestamp: new Date().toISOString(),
      }));
    },
  });

  // 4. Register background scheduler service
  api.registerService({
    id: "gyeol-scheduler",
    start: async () => {
      logger.info(`[Gyeol] Scheduler service starting — ${GYEOL_JOBS.length} jobs`);

      // Dynamic import croner (OpenClaw's cron library)
      const { Cron } = await import("croner");

      for (const job of GYEOL_JOBS) {
        new Cron(job.schedule, async () => {
          logger.info(`[${ts()}] -> Running ${job.name}`);
          try {
            await runJob(job, logger);
          } catch {
            // already logged in runJob
          }
        });
        logger.info(`  ${job.name.padEnd(24)} ${job.schedule}`);
      }

      // Lifeline watchdog (HTTP — must test the HTTP path, not direct execution)
      new Cron(LIFELINE_SCHEDULE, async () => {
        logger.info(`[${ts()}] -> Running lifeline (HTTP watchdog)`);
        await executeLifeline(logger);
      });
      logger.info(`  ${"lifeline".padEnd(24)} ${LIFELINE_SCHEDULE} (HTTP watchdog)`);

      // Startup catch-up for critical jobs (30s delay)
      const STARTUP_DELAY_MS = 30_000;
      setTimeout(async () => {
        logger.info(`[${ts()}] Running startup catch-up for critical jobs`);
        const criticalJobs = GYEOL_JOBS.filter((j) => j.critical);
        for (const job of criticalJobs) {
          try {
            await runJob(job, logger);
          } catch {
            // already logged
          }
        }
      }, STARTUP_DELAY_MS);

      logger.info(
        `[${ts()}] Gyeol scheduler ready — ${GYEOL_JOBS.length} jobs registered`
      );
      logger.info(
        `[${ts()}] Critical jobs catch-up in ${STARTUP_DELAY_MS / 1000}s`
      );
    },
  });

  logger.info("[Gyeol] Plugin registered successfully");
}
