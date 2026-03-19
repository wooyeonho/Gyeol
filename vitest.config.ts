import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["lib/**/*.ts", "store/**/*.ts", "hooks/**/*.ts", "app/api/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.contract.test.ts", "node_modules/**"],
    },
  },
});
