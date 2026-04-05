#!/usr/bin/env node
/**
 * Pre-deploy validation script.
 * Run: node scripts/pre-deploy-check.mjs
 * Checks: typecheck, lint, middleware existence, build.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(label, cmd) {
  console.log(`\n--- ${label} ---`);
  try {
    execSync(cmd, { cwd: root, stdio: "inherit" });
    console.log(`  OK`);
    return true;
  } catch {
    console.error(`  FAIL: ${label}`);
    return false;
  }
}

let ok = true;

// 1. Middleware existence — Next.js only recognizes middleware.ts at the project root.
//    proxy.ts alone is NOT sufficient; it must be re-exported via middleware.ts.
console.log("\n--- middleware.ts check ---");
const hasMiddleware = existsSync(resolve(root, "middleware.ts"));
if (!hasMiddleware) {
  console.error("  FAIL: middleware.ts not found at project root. Next.js will not execute any middleware.");
  console.error("        CSP headers, CSRF protection, rate limiting, and auth session refresh will be disabled.");
  ok = false;
} else {
  console.log(`  OK (middleware.ts: ${hasMiddleware})`);
}

// 2. Typecheck
if (!run("TypeScript typecheck", "npx tsc --noEmit")) ok = false;

// 3. Lint
if (!run("ESLint", "npx next lint --max-warnings 100")) ok = false;

// 4. Build
if (!run("Next.js build", "npx next build")) ok = false;

if (ok) {
  console.log("\n All pre-deploy checks passed.\n");
  process.exit(0);
} else {
  console.error("\n Some pre-deploy checks failed. Fix before deploying.\n");
  process.exit(1);
}
