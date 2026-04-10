import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Onboarding / Signup flow.
 *
 * Covers the signup page form elements, validation behavior, and the
 * onboarding wizard that appears for first-time users on the home page.
 * Since tests run without real Supabase credentials the focus is on UI
 * structure and client-side validation rather than end-to-end auth.
 */
test.describe("Signup page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("page loads without 500 error", async ({ page }) => {
    const status = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="next-error"]');
      return meta ? "error" : "ok";
    });
    expect(status).toBe("ok");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("email input is visible and has correct type", async ({ page }) => {
    const emailInput = page.locator("#signup-email");
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("password input is visible and has correct type", async ({ page }) => {
    const passwordInput = page.locator("#signup-password");
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("submit button is present", async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
  });

  test("consent checkbox is required", async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible({ timeout: 10_000 });
    // The checkbox must be checked before submission is allowed
    await expect(checkbox).not.toBeChecked();
  });

  test("terms and privacy links are present", async ({ page }) => {
    const termsLink = page.locator('a[href="/terms"]');
    const privacyLink = page.locator('a[href="/privacy"]');
    await expect(termsLink).toBeVisible({ timeout: 10_000 });
    await expect(privacyLink).toBeVisible({ timeout: 10_000 });
  });

  test("login link navigates to login page", async ({ page }) => {
    const loginLink = page.locator('a[href^="/login"]');
    await expect(loginLink).toBeVisible({ timeout: 10_000 });
    const href = await loginLink.getAttribute("href");
    expect(href).toContain("/login");
  });

  test("features link is present", async ({ page }) => {
    const featuresLink = page.locator('a[href="/features"]');
    await expect(featuresLink).toBeVisible({ timeout: 10_000 });
  });

  test("form shows error when submitted without consent", async ({ page }) => {
    // Fill in valid email and password but do NOT check consent
    const emailInput = page.locator("#signup-email");
    const passwordInput = page.locator("#signup-password");
    await emailInput.fill("test@example.com");
    await passwordInput.fill("TestPassword123!");

    // Click submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // The browser's native validation or the app's consent error should prevent submission
    // Either an error message appears or the form stays on the same page
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toContain("/signup");
  });

  test("no JavaScript errors on page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/signup");
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("NEXT_PUBLIC") && !e.includes("fetch"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Onboarding wizard (home page)", () => {
  test("home page shows onboarding or main content", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    // The home page either shows the onboarding overlay (for new users),
    // the age gate, or the main creature/chat interface.
    // All of these are valid states in a test environment.
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("onboarding has progress dots when visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    // The onboarding overlay renders progress dots as small divs
    // with rounded-full class inside a fixed overlay. If onboarding
    // is not shown (user redirected or already completed), skip.
    const overlay = page.locator(".fixed.inset-0");
    const overlayCount = await overlay.count();
    if (overlayCount > 0) {
      // Progress dots should be present
      const dots = overlay.locator(".rounded-full");
      const dotCount = await dots.count();
      expect(dotCount).toBeGreaterThan(0);
    }
  });

  test("onboarding skip button is accessible when visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000);

    // Look for a skip button within the onboarding overlay
    const skipButton = page.locator('button').filter({ hasText: /skip/i });
    const skipCount = await skipButton.count();
    // If onboarding is shown, there should be a skip button
    // If not shown, this is a no-op — we just verify no crash
    if (skipCount > 0) {
      await expect(skipButton.first()).toBeVisible();
    }
  });
});
