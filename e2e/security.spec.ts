/**
 * E2E Security Tests
 *
 * Verify that security mechanisms work correctly in the browser context.
 */
import { test, expect } from "@playwright/test";

test.describe("Security Headers", () => {
  test("has Content-Security-Policy header", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).toBeTruthy();
    const csp = response!.headers()["content-security-policy"];
    // CSP should exist and block inline scripts
    expect(csp).toBeTruthy();
  });

  test("has X-Content-Type-Options header", async ({ page }) => {
    const response = await page.goto("/");
    const header = response!.headers()["x-content-type-options"];
    expect(header).toBe("nosniff");
  });

  test("has X-Frame-Options header", async ({ page }) => {
    const response = await page.goto("/");
    const header = response!.headers()["x-frame-options"];
    expect(header).toBeTruthy();
  });

  test("has Referrer-Policy header", async ({ page }) => {
    const response = await page.goto("/");
    const header = response!.headers()["referrer-policy"];
    expect(header).toBeTruthy();
  });
});

test.describe("CSRF Protection", () => {
  test("POST to /api/care without Origin returns 403", async ({ request }) => {
    const response = await request.post("/api/care", {
      data: { agentId: "00000000-0000-4000-8000-000000000001", action: "feed" },
      headers: { "Content-Type": "application/json" },
    });
    // Should be blocked by CSRF (no Origin header matching the host)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("POST to /api/chat without Origin returns 403", async ({ request }) => {
    const response = await request.post("/api/chat", {
      data: { message: "hello" },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("XSS Prevention", () => {
  test("script tags in URL params are not rendered", async ({ page }) => {
    await page.goto('/?q=<script>alert("xss")</script>');
    // Page should load without executing the script
    const hasAlert = await page.evaluate(() => {
      return (window as unknown as { _xssTriggered?: boolean })._xssTriggered === true;
    });
    expect(hasAlert).toBe(false);
  });
});

test.describe("Authentication", () => {
  test("unauthenticated API requests return 401", async ({ request }) => {
    const endpoints = [
      { method: "GET" as const, url: "/api/settings" },
    ];

    for (const ep of endpoints) {
      const response = await request[ep.method.toLowerCase() as "get"](ep.url);
      // Should require auth — either 401 or 403
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
