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

  it("fails open by default on storage errors", async () => {
    (createServiceClient as Mock).mockImplementation(() => {
      throw new Error("db unavailable");
    });

    const { checkRateLimit } = await import("./rate-limit");
    const allowed = await checkRateLimit("chat:user-1");
    expect(allowed).toBe(true);
  });

  it("can fail closed when configured", async () => {
    process.env.RATE_LIMIT_FAIL_MODE = "closed";
    (createServiceClient as Mock).mockImplementation(() => {
      throw new Error("db unavailable");
    });

    const { checkRateLimit } = await import("./rate-limit");
    const allowed = await checkRateLimit("chat:user-1");
    expect(allowed).toBe(false);
  });
});
