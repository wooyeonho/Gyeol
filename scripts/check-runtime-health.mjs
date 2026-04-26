#!/usr/bin/env node

/**
 * Runtime health checker for production-like environments.
 *
 * Checks:
 * 1) Required OpenClaw env presence
 * 2) App cron health endpoint (/api/cron/health)
 * 3) OpenClaw service health endpoint (/health or /gyeol/health)
 *
 * This script is safe to run locally: it degrades gracefully when env values
 * are absent and prints actionable warnings instead of throwing immediately.
 */

const REQUIRED_OPENCLAW_ENV = [
  "GYEOL_APP_URL",
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
];

const STRICT_MODE = process.argv.includes("--strict");
let failureCount = 0;

function normalizeBase(url) {
  return url ? url.replace(/\/+$/, "") : "";
}

function withTimeout(ms = 10000) {
  return AbortSignal.timeout(ms);
}

async function probeJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: withTimeout(10000) });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

function printEnvSummary() {
  console.log("== OpenClaw env check ==");
  let missing = 0;
  for (const key of REQUIRED_OPENCLAW_ENV) {
    const exists = Boolean(process.env[key]);
    if (!exists) missing += 1;
    console.log(`- ${key}: ${exists ? "set" : "missing"}`);
  }
  console.log(`=> Missing ${missing}/${REQUIRED_OPENCLAW_ENV.length} required values\n`);
  if (STRICT_MODE && missing > 0) {
    failureCount += missing;
  }
  return missing;
}

async function checkAppCronHealth() {
  const appUrl = normalizeBase(process.env.GYEOL_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "");
  const cronSecret = process.env.CRON_SECRET;

  if (!appUrl) {
    console.log("== App cron health check ==");
    console.log("- skipped: GYEOL_APP_URL or NEXT_PUBLIC_APP_URL is missing\n");
    if (STRICT_MODE) failureCount += 1;
    return;
  }

  const headers = cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {};
  const endpoint = `${appUrl}/api/cron/health`;
  console.log("== App cron health check ==");
  console.log(`- probing ${endpoint}`);
  const result = await probeJson(endpoint, headers).catch((error) => ({ ok: false, status: 0, body: { error: String(error) } }));
  console.log(`- status: ${result.status} (${result.ok ? "ok" : "not ok"})`);
  if (result.body) {
    console.log(`- body: ${JSON.stringify(result.body).slice(0, 400)}`);
  }
  console.log();
  if (STRICT_MODE && !result.ok) failureCount += 1;
}

async function checkOpsReadiness() {
  const appUrl = normalizeBase(process.env.GYEOL_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "");
  const cronSecret = process.env.CRON_SECRET;
  if (!appUrl || !cronSecret) {
    console.log("== Ops readiness check ==");
    console.log("- skipped: requires GYEOL_APP_URL/NEXT_PUBLIC_APP_URL and CRON_SECRET\n");
    if (STRICT_MODE) failureCount += 1;
    return;
  }

  const endpoint = `${appUrl}/api/ops/readiness`;
  console.log("== Ops readiness check ==");
  console.log(`- probing ${endpoint}`);
  const result = await probeJson(endpoint, { Authorization: `Bearer ${cronSecret}` }).catch((error) => ({
    ok: false,
    status: 0,
    body: { error: String(error) },
  }));
  console.log(`- status: ${result.status} (${result.ok ? "ok" : "not ok"})`);
  if (result.body) {
    const autonomyTier = result.body?.autonomy_health?.tier;
    if (autonomyTier) {
      console.log(`- autonomy tier: ${autonomyTier}`);
    }
    console.log(`- body: ${JSON.stringify(result.body).slice(0, 400)}`);
  }
  console.log();
  if (STRICT_MODE && !result.ok) failureCount += 1;
}

async function checkOpenClawHealth() {
  const openclawUrl = normalizeBase(process.env.OPENCLAW_URL || "");
  if (!openclawUrl) {
    console.log("== OpenClaw health check ==");
    console.log("- skipped: OPENCLAW_URL is missing\n");
    if (STRICT_MODE) failureCount += 1;
    return;
  }

  console.log("== OpenClaw health check ==");
  const candidates = [`${openclawUrl}/health`, `${openclawUrl}/gyeol/health`];
  for (const endpoint of candidates) {
    const result = await probeJson(endpoint).catch((error) => ({ ok: false, status: 0, body: { error: String(error) } }));
    console.log(`- ${endpoint} -> ${result.status} (${result.ok ? "ok" : "not ok"})`);
    if (result.ok) {
      console.log(`- body: ${JSON.stringify(result.body).slice(0, 240)}\n`);
      return;
    }
  }
  console.log("- warning: no OpenClaw health endpoint responded successfully\n");
  if (STRICT_MODE) failureCount += 1;
}

async function main() {
  console.log(`Runtime check mode: ${STRICT_MODE ? "STRICT" : "ADVISORY"}\n`);
  printEnvSummary();
  await checkAppCronHealth();
  await checkOpsReadiness();
  await checkOpenClawHealth();
  if (STRICT_MODE && failureCount > 0) {
    console.error(`runtime check failed: ${failureCount} issue(s) detected`);
    process.exit(1);
  }
}

await main();
