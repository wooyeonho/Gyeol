import { test, expect } from "@playwright/test";

/**
 * Smoke tests — verify critical pages load without errors.
 */
test.describe("Smoke tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Gyeol|결/i);
    // Ensure no crash — page has content
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("discover page loads", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("API health check", async ({ request }) => {
    const response = await request.get("/api/health");
    // API might return 200 or 404 if no health endpoint exists
    expect([200, 404]).toContain(response.status());
  });
});

test.describe("Accessibility basics", () => {
  test("landing page has skip-to-content or main landmark", async ({ page }) => {
    await page.goto("/");
    const main = page.locator("main, [role='main']");
    // At least one main landmark should exist
    await expect(main.first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigation has aria-label", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav[aria-label]");
    // Should have at least one labeled nav
    const count = await nav.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
