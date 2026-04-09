import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.RATE_LIMIT_FAIL_MODE;
  });

  it("fails closed by default on storage errors", async () => {
    (createServiceClient as Mock).mockImplementation(() => {
      throw new Error("db unavailable");
    });

    const { checkRateLimit } = await import("./rate-limit");
    const allowed = await checkRateLimit("chat:user-1");
    expect(allowed).toBe(false);
  });

  it("always fails closed even with env override (security hardening)", async () => {
    process.env.RATE_LIMIT_FAIL_MODE = "open";
    (createServiceClient as Mock).mockImplementation(() => {
      throw new Error("db unavailable");
    });

    const { checkRateLimit } = await import("./rate-limit");
    const allowed = await checkRateLimit("chat:user-1");
    // Fail-open was removed in security hardening — always deny on error
    expect(allowed).toBe(false);
  });
});
