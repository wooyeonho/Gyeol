import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for Gyeol.
 *
 * Run with: npx playwright test
 * Install browsers first: npx playwright install --with-deps
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  /* Visual regression snapshot settings */
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}/{testFilePath}/{arg}{ext}",
  expect: {
    toMatchSnapshot: {
      /* Allow small pixel differences from anti-aliasing / font rendering */
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
