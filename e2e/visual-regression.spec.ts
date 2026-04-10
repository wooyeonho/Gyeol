import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for key pages.
 *
 * These tests capture full-page screenshots and compare them against
 * previously approved baseline snapshots using Playwright's built-in
 * `toMatchSnapshot()` API.
 *
 * First run:
 *   npx playwright test e2e/visual-regression.spec.ts --update-snapshots
 *
 * Subsequent runs compare against the stored baselines. If a visual
 * diff exceeds the threshold the test fails and a diff image is saved
 * to the test-results directory for manual review.
 *
 * Adjust `maxDiffPixelRatio` per-test to tune sensitivity (0 = exact
 * match, 0.01 = allow ~1% pixel difference to absorb anti-aliasing
 * and font-rendering variance across environments).
 */

test.describe("Visual regression", () => {
  // Give pages extra time to finish animations / lazy loading
  test.beforeEach(async ({ page }) => {
    // Disable CSS animations and transitions to produce stable screenshots
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
  });

  test("home page (logged-out view)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Wait for any loading spinners or skeletons to resolve
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot("home-logged-out.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("login page", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot("login-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("discover page skeleton", async ({ page }) => {
    await page.goto("/discover", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot("discover-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("signup page", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot("signup-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("settings page", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot("settings-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
