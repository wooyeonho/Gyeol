/**
 * Legacy Scheduler (Deprecated)
 *
 * This file existed in v2 for the custom node-cron scheduler.
 * In v3, scheduling is handled by:
 *   - OpenClaw gateway's built-in cron system
 *   - Gyeol plugin (src/plugin.ts) which registers jobs via croner
 *
 * This file is kept for backward compatibility of imports.
 * Use plugin.ts or index.ts instead.
 */

import { EngineConfig } from "./config";
import { logger } from "../../lib/logger";

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
};

function ts(): string {
  return new Date().toISOString();
}

/**
 * @deprecated Use OpenClaw gateway instead. This is a fallback for
 * environments where OpenClaw gateway is not available.
 */
export function startScheduler(_config: EngineConfig): void {
  logger.info(`[${ts()}] [DEPRECATED] Legacy scheduler called — use OpenClaw gateway instead`);
  logger.info(`[${ts()}] Starting fallback scheduler with setInterval...`);

  // Fallback: use simple setInterval scheduling
  const schedules: Array<{ name: string; intervalMs: number; execute: () => Promise<unknown> }> = [
    { name: "health",       intervalMs: 30 * 60 * 1000,      execute: executeHealth },
    { name: "heartbeat",    intervalMs: 2 * 60 * 60 * 1000,  execute: executeHeartbeat },
    { name: "timecapsule",  intervalMs: 60 * 60 * 1000,      execute: executeTimeCapsule },
    { name: "social",       intervalMs: 6 * 60 * 60 * 1000,  execute: executeSocial },
    { name: "learner",      intervalMs: 6 * 60 * 60 * 1000,  execute: () => executeLearner() },
    { name: "crawl",        intervalMs: 8 * 60 * 60 * 1000,  execute: executeCrawl },
    { name: "war",          intervalMs: 60 * 60 * 1000,      execute: executeWar },
  ];

  for (const sched of schedules) {
    setInterval(async () => {
      logger.info(`[${ts()}] -> Running ${sched.name} (fallback)`);
      try {
        const result = await sched.execute();
        logger.info(`[${ts()}] OK ${sched.name}: ${JSON.stringify(result).slice(0, 200)}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[${ts()}] FAIL ${sched.name}: ${msg}`);
      }
    }, sched.intervalMs);
    logger.info(`  ${sched.name.padEnd(16)} every ${sched.intervalMs / 60000}m (fallback)`);
  }

  // Startup catch-up
  setTimeout(async () => {
    logger.info(`[${ts()}] Running startup catch-up`);
    for (const name of ["health", "heartbeat"]) {
      const job = JOBS[name];
      if (job) {
        try {
          const result = await job();
          logger.info(`[${ts()}] OK startup ${name}: ${JSON.stringify(result).slice(0, 200)}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`[${ts()}] FAIL startup ${name}: ${msg}`);
        }
      }
    }
  }, 30_000);
}

/**
 * @deprecated Use `node dist/openclaw/src/index.js run-once` instead.
 */
export async function runOnce(_config: EngineConfig, jobName?: string): Promise<void> {
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
