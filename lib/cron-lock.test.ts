import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

describe("acquireCronLock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.CRON_LOCK_FAIL_MODE;
  });

  it("fails open by default when rpc errors", async () => {
    (createServiceClient as Mock).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "rpc failed" } }),
    });

    const { acquireCronLock } = await import("./cron-lock");
    const acquired = await acquireCronLock("cron:test");
    expect(acquired).toBe(true);
  });

  it("can fail closed when configured", async () => {
    process.env.CRON_LOCK_FAIL_MODE = "closed";
    (createServiceClient as Mock).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "rpc failed" } }),
    });

    const { acquireCronLock } = await import("./cron-lock");
    const acquired = await acquireCronLock("cron:test");
    expect(acquired).toBe(false);
  });
});
