import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyCsrfOrigin } from "./csrf";
import { NextRequest } from "next/server";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://gyeol.app/api/test", { headers });
}

describe("verifyCsrfOrigin", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_ALLOWED_ORIGINS", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts matching Origin header", () => {
    const req = makeRequest({
      host: "gyeol.app",
      origin: "https://gyeol.app",
    });
    expect(verifyCsrfOrigin(req)).toBe(true);
  });

  it("rejects mismatched Origin header", () => {
    const req = makeRequest({
      host: "gyeol.app",
      origin: "https://evil.com",
    });
    expect(verifyCsrfOrigin(req)).toBe(false);
  });

  it("falls back to Referer when Origin is absent", () => {
    const req = makeRequest({
      host: "gyeol.app",
      referer: "https://gyeol.app/social",
    });
    expect(verifyCsrfOrigin(req)).toBe(true);
  });

  it("rejects mismatched Referer", () => {
    const req = makeRequest({
      host: "gyeol.app",
      referer: "https://evil.com/phish",
    });
    expect(verifyCsrfOrigin(req)).toBe(false);
  });

  it("rejects when no Origin or Referer", () => {
    const req = makeRequest({ host: "gyeol.app" });
    expect(verifyCsrfOrigin(req)).toBe(false);
  });

  it("rejects when no host header", () => {
    const req = makeRequest({ origin: "https://gyeol.app" });
    expect(verifyCsrfOrigin(req)).toBe(false);
  });

  it("accepts localhost for dev", () => {
    const req = makeRequest({
      host: "localhost:3000",
      origin: "http://localhost:3000",
    });
    expect(verifyCsrfOrigin(req)).toBe(true);
  });

  it("accepts extra allowed origins from env", () => {
    vi.stubEnv("CSRF_ALLOWED_ORIGINS", "https://preview.gyeol.app,https://staging.gyeol.app");
    const req = makeRequest({
      host: "gyeol.app",
      origin: "https://preview.gyeol.app",
    });
    expect(verifyCsrfOrigin(req)).toBe(true);
  });
});
