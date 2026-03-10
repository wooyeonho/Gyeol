#!/usr/bin/env node

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/$/, "");
const cronSecret = process.env.CRON_SECRET || "";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "CRON_SECRET",
  "CONNECTION_TOKEN_KEY",
  "TELEGRAM_WEBHOOK_SECRET",
];

const stripeEnv = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PREMIUM_MONTHLY",
];

function fail(message) {
  console.error(`\n[verify:deploy] ${message}`);
  process.exit(1);
}

for (const key of requiredEnv) {
  if (!process.env[key]) fail(`Missing required env: ${key}`);
}

const stripeConfigured = stripeEnv.every((key) => Boolean(process.env[key]));
if (!stripeConfigured) {
  console.warn("[verify:deploy] Stripe env is incomplete. Checkout/portal will not be available.");
}

if (!appUrl) fail("APP_URL/NEXT_PUBLIC_APP_URL is required");

async function verifyReadiness() {
  const res = await fetch(`${appUrl}/api/ops/readiness`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  if (!res.ok) fail(`/api/ops/readiness failed with ${res.status}`);
  const body = await res.json();
  if (typeof body.checked_at !== "string") fail("readiness payload missing checked_at");
  if (!Array.isArray(body.env_status)) fail("readiness payload missing env_status");
  if (typeof body.stripe_configured !== "boolean") fail("readiness payload missing stripe_configured");
  console.log(`[verify:deploy] readiness ok (stripe_configured=${body.stripe_configured})`);
}

async function verifyDashboard() {
  const res = await fetch(`${appUrl}/api/dashboard`);
  if (!res.ok) fail(`/api/dashboard failed with ${res.status}`);
  const body = await res.json();
  if (typeof body.agent_count !== "number") fail("dashboard payload missing agent_count");
  console.log("[verify:deploy] dashboard ok");
}

await verifyReadiness();
await verifyDashboard();

console.log("\n[verify:deploy] deployment checks passed");
