import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("loadConfig", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("parses required and optional config", async () => {
    process.env.GYEOL_APP_URL = "https://example.com/";
    process.env.CRON_SECRET = "cron-secret";
    process.env.PORT = "9000";
    process.env.CRAWL_URLS = "https://a.com, https://b.com ";
    process.env.CRAWL_MAX_PAGES = "22";
    process.env.CRAWL_DEPTH = "3";
    process.env.USE_HMAC_AUTH = "true";

    const { loadConfig } = await import("./config");
    expect(loadConfig()).toEqual({
      appUrl: "https://example.com",
      cronSecret: "cron-secret",
      port: 9000,
      crawlUrls: ["https://a.com", "https://b.com"],
      crawlMaxPages: 22,
      crawlDepth: 3,
      useHmacAuth: true,
    });
  });

  it("warns and returns empty string when required env is missing", async () => {
    delete process.env.GYEOL_APP_URL;
    process.env.CRON_SECRET = "cron-secret";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { loadConfig } = await import("./config");
    const cfg = loadConfig();
    expect(cfg.appUrl).toBe("");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("GYEOL_APP_URL"));
    warnSpy.mockRestore();
  });
});
