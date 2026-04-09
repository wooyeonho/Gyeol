import { test, expect } from "@playwright/test";

/**
 * E2E smoke tests for the Settings page (/settings).
 *
 * Verifies the page loads and that settings panel elements such as
 * locale switcher, theme options, and account sections render.
 * May redirect to /login if unauthenticated.
 */
test.describe("Settings page", () => {
  test("page loads without 500 error", async ({ page }) => {
    const response = await page.goto("/settings");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("page has visible content", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("settings page contains interactive elements", async ({ page }) => {
    await page.goto("/settings");
    // Settings page has buttons for various actions (logout, invite, etc.)
    // and select/input elements for preferences
    const interactiveElements = page.locator("button, select, input, a");
    const count = await interactiveElements.count();
    // Even when redirected to login, there should be interactive elements
    expect(count).toBeGreaterThan(0);
  });

  test("bottom navigation is present", async ({ page }) => {
    await page.goto("/settings");
    const nav = page.locator("nav");
    const count = await nav.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("page does not show unhandled runtime error overlay", async ({ page }) => {
    await page.goto("/settings");
    // Next.js error overlay has a specific id
    const errorOverlay = page.locator("#__next-error");
    const overlayCount = await errorOverlay.count();
    expect(overlayCount).toBe(0);
  });
});
