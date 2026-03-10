#!/usr/bin/env node
/**
 * Run phase23+24 migrations.
 * Usage: DATABASE_URL="postgresql://..." node scripts/run-migrations.mjs
 * Or: SUPABASE_DB_URL="..." node scripts/run-migrations.mjs
 *
 * Get connection string from Supabase Dashboard → Settings → Database → Connection string (URI)
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "apply-phase23-24.sql");
const sql = readFileSync(sqlPath, "utf8");

const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Set DATABASE_URL or SUPABASE_DB_URL");
  console.error("Example: DATABASE_URL='postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres' node scripts/run-migrations.mjs");
  process.exit(1);
}

async function main() {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(sql);
    console.log("✓ Migrations applied (phase23, phase24)");
  } catch (e) {
    console.error("Migration failed:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
