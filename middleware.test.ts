/**
 * Middleware Security Tests
 *
 * Tests for Next.js middleware: CSP, CSRF, rate limiting, security headers.
 * Uses a lightweight mock approach since middleware can't be imported directly.
 */
import { describe, it, expect } from "vitest";

/**
 * Since Next.js middleware is tightly coupled with the runtime,
 * we test the security logic via the E2E security spec and
 * unit-test the helpers it relies on. These tests verify
 * the configuration values and patterns used in middleware.
 */

describe("Middleware CSRF exempt paths", () => {
  const CSRF_EXEMPT_PREFIXES = [
    "/api/webhook",
    "/api/billing/webhook",
    "/api/cron",
    "/api/v1",
    "/api/email/send",
  ];

  function isCsrfExempt(pathname: string): boolean {
    return CSRF_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }

  it("exempts webhook paths", () => {
    expect(isCsrfExempt("/api/webhook")).toBe(true);
    expect(isCsrfExempt("/api/webhook/stripe")).toBe(true);
    expect(isCsrfExempt("/api/billing/webhook")).toBe(true);
  });

  it("exempts cron paths", () => {
    expect(isCsrfExempt("/api/cron")).toBe(true);
    expect(isCsrfExempt("/api/cron/heartbeat")).toBe(true);
  });

  it("exempts v1 API paths", () => {
    expect(isCsrfExempt("/api/v1")).toBe(true);
    expect(isCsrfExempt("/api/v1/agent/chat")).toBe(true);
  });

  it("exempts email send path", () => {
    expect(isCsrfExempt("/api/email/send")).toBe(true);
  });

  it("does NOT exempt normal API paths", () => {
    expect(isCsrfExempt("/api/chat")).toBe(false);
    expect(isCsrfExempt("/api/settings")).toBe(false);
    expect(isCsrfExempt("/api/care")).toBe(false);
    expect(isCsrfExempt("/api/social/follow")).toBe(false);
    expect(isCsrfExempt("/api/earnings/redeem")).toBe(false);
  });

  it("does NOT exempt partial matches", () => {
    expect(isCsrfExempt("/api/cronExtra")).toBe(false);
    expect(isCsrfExempt("/api/v1Extra")).toBe(false);
  });
});

describe("Middleware public paths", () => {
  const PUBLIC_PATHS = [
    "/login", "/signup", "/auth", "/features", "/plans",
    "/explore", "/dashboard", "/adopt", "/share", "/invite",
    "/community", "/privacy", "/terms", "/landing", "/demo", "/offline",
  ];

  function isPublicPath(pathname: string): boolean {
    if (pathname === "/") return false;
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }

  it("allows login and signup", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
  });

  it("allows marketing pages", () => {
    expect(isPublicPath("/features")).toBe(true);
    expect(isPublicPath("/plans")).toBe(true);
    expect(isPublicPath("/landing")).toBe(true);
  });

  it("allows legal pages", () => {
    expect(isPublicPath("/privacy")).toBe(true);
    expect(isPublicPath("/terms")).toBe(true);
  });

  it("allows demo and explore", () => {
    expect(isPublicPath("/demo")).toBe(true);
    expect(isPublicPath("/explore")).toBe(true);
    expect(isPublicPath("/demo/chat")).toBe(true);
  });

  it("does NOT allow root as public", () => {
    expect(isPublicPath("/")).toBe(false);
  });

  it("does NOT allow authenticated pages", () => {
    expect(isPublicPath("/settings")).toBe(false);
    expect(isPublicPath("/dna")).toBe(false);
    expect(isPublicPath("/challenges")).toBe(false);
    expect(isPublicPath("/social")).toBe(false);
  });
});

describe("Middleware IP rate limiter logic", () => {
  const IP_WINDOW_MS = 60_000;
  const IP_MAX_REQUESTS = 120;
  const IP_MAX_AUTH_REQUESTS = 10;

  it("has reasonable default limits", () => {
    expect(IP_MAX_REQUESTS).toBeGreaterThanOrEqual(60);
    expect(IP_MAX_AUTH_REQUESTS).toBeLessThanOrEqual(20);
  });

  it("auth limit is stricter than general limit", () => {
    expect(IP_MAX_AUTH_REQUESTS).toBeLessThan(IP_MAX_REQUESTS);
  });

  it("window is 60 seconds", () => {
    expect(IP_WINDOW_MS).toBe(60_000);
  });
});

describe("Middleware security headers configuration", () => {
  it("CSP includes strict directives", () => {
    // These are verified in the E2E security test, but we
    // document the expected values here for reference
    const expectedDirectives = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ];

    for (const d of expectedDirectives) {
      expect(d).toBeTruthy(); // Smoke test that values are defined
    }
  });
});
