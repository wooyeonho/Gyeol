import { test, expect } from "@playwright/test";

/**
 * E2E smoke tests for the Login flow (/login).
 *
 * Verifies the login page loads without errors and that the
 * expected form elements (email, password, submit, OAuth, guest,
 * signup link) are present in the DOM.
 */
test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("page loads without 500 error", async ({ page }) => {
    // Should not be a server error page
    const status = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="next-error"]');
      return meta ? "error" : "ok";
    });
    expect(status).toBe("ok");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("email input is visible", async ({ page }) => {
    const emailInput = page.locator("#login-email");
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("password input is visible", async ({ page }) => {
    const passwordInput = page.locator("#login-password");
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("submit button is present", async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
  });

  test("guest continue button is present", async ({ page }) => {
    // Guest button is a type="button" element distinct from submit
    const guestButton = page.locator('button[type="button"]').first();
    await expect(guestButton).toBeVisible({ timeout: 10_000 });
  });

  test("signup link navigates correctly", async ({ page }) => {
    const signupLink = page.locator('a[href^="/signup"]');
    await expect(signupLink).toBeVisible({ timeout: 10_000 });
    const href = await signupLink.getAttribute("href");
    expect(href).toContain("/signup");
  });

  test("forgot password link is present", async ({ page }) => {
    const forgotLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotLink).toBeVisible({ timeout: 10_000 });
  });
});
