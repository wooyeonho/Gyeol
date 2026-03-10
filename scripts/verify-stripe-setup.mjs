#!/usr/bin/env node
/**
 * Stripe 설정 검증 스크립트
 * Usage: node scripts/verify-stripe-setup.mjs
 */
const required = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO", "STRIPE_PRICE_PREMIUM"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error("❌ Missing:", missing.join(", "));
  console.error("   Set in .env or: STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... node scripts/verify-stripe-setup.mjs");
  process.exit(1);
}
console.log("✓ STRIPE_SECRET_KEY set");
console.log("✓ STRIPE_WEBHOOK_SECRET set");
console.log("✓ STRIPE_PRICE_PRO:", process.env.STRIPE_PRICE_PRO?.slice(0, 12) + "...");
console.log("✓ STRIPE_PRICE_PREMIUM:", process.env.STRIPE_PRICE_PREMIUM?.slice(0, 12) + "...");
console.log("\n✓ Stripe setup OK. Webhook URL: https://your-app.vercel.app/api/webhook/stripe");
