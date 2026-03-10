#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const migrationsDir = path.resolve("supabase/migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => /^phase\d+.*\.sql$/.test(file))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

if (migrationFiles.length === 0) {
  console.log("[db:migrate] no migration files found");
  process.exit(0);
}

const combinedSql = migrationFiles
  .map((file) => `-- ${file}\n${fs.readFileSync(path.join(migrationsDir, file), "utf8")}`)
  .join("\n\n");

const outputPath = path.resolve("scripts/apply-all-migrations.generated.sql");
fs.writeFileSync(outputPath, combinedSql);
console.log(`[db:migrate] combined SQL written to ${outputPath}`);

if (!process.env.DATABASE_URL) {
  console.log("[db:migrate] DATABASE_URL is not set. Generated SQL only.");
  process.exit(0);
}

const tempFile = path.join(os.tmpdir(), `gyeol-migrations-${Date.now()}.sql`);
fs.writeFileSync(tempFile, combinedSql);
try {
  execFileSync("psql", [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", tempFile], {
    stdio: "inherit",
  });
  console.log("[db:migrate] migration apply complete");
} finally {
  fs.unlinkSync(tempFile);
}
