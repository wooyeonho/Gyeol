import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineConfig } from "./config";

const config: EngineConfig = {
  appUrl: "https://example.com",
  cronSecret: "cron-secret",
  port: 8000,
  crawlUrls: [],
  crawlMaxPages: 10,
  crawlDepth: 1,
  useHmacAuth: false,
};

describe("runOnce", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "ok",
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the selected cron endpoint once", async () => {
    const { runOnce } = await import("./scheduler");
    await runOnce(config, "health");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/api/cron/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer cron-secret",
        }),
      })
    );
  });

  it("does not call fetch for unknown jobs", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runOnce } = await import("./scheduler");
    await runOnce(config, "unknown-job");

    expect(fetch).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
