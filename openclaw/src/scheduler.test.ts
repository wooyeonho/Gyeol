import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineConfig } from "./config";

// Mock all direct execution functions from cron-core
vi.mock("../../lib/cron-core", () => ({
  executeHealth: vi.fn().mockResolvedValue({ ok: true }),
  executeHeartbeat: vi.fn().mockResolvedValue({ processed: 0 }),
  executeDream: vi.fn().mockResolvedValue({ processed: 0 }),
  executeSocial: vi.fn().mockResolvedValue({ processed: 0 }),
  executeLearner: vi.fn().mockResolvedValue({ processed: 0 }),
  executeCrawl: vi.fn().mockResolvedValue({ processed: 0 }),
  executeRetention: vi.fn().mockResolvedValue({ processed: 0 }),
  executeWorld: vi.fn().mockResolvedValue({ processed: 0 }),
  executeTimeCapsule: vi.fn().mockResolvedValue({ processed: 0 }),
  executeRecap: vi.fn().mockResolvedValue({ processed: 0 }),
  executeRedemption: vi.fn().mockResolvedValue({ processed: 0 }),
  executeWar: vi.fn().mockResolvedValue({ processed: 0 }),
  executeProactivePush: vi.fn().mockResolvedValue({ processed: 0 }),
}));

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
    // Stub fetch for HTTP-only jobs (lifeline)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "ok",
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the selected direct job once", async () => {
    const { runOnce } = await import("./scheduler");
    const { executeHealth } = await import("../../lib/cron-core");
    await runOnce(config, "health");

    expect(executeHealth).toHaveBeenCalledTimes(1);
    // Direct jobs should NOT use fetch
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not call anything for unknown jobs", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runOnce } = await import("./scheduler");
    await runOnce(config, "unknown-job");

    expect(fetch).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("calls recap direct execution when runOnce recap", async () => {
    const { runOnce } = await import("./scheduler");
    const { executeRecap } = await import("../../lib/cron-core");
    await runOnce(config, "recap");

    expect(executeRecap).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls all registered jobs when no job name is passed", async () => {
    const { runOnce } = await import("./scheduler");
    await runOnce(config);

    // All 13 jobs are direct execution — no fetch calls
    expect(fetch).not.toHaveBeenCalled();
  });

  it("logs error for unknown lifeline job", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runOnce } = await import("./scheduler");
    await runOnce(config, "lifeline");

    // lifeline is no longer a registered job in the legacy scheduler
    expect(fetch).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
