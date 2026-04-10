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

  it("denies requests without valid UUID (prevents shared-bucket bypass)", async () => {
    const rpcFn = vi.fn();
    (createServiceClient as Mock).mockReturnValue({ rpc: rpcFn, from: vi.fn() });

    const { checkRateLimit } = await import("./rate-limit");
    const allowed = await checkRateLimit("no-uuid-key");
    expect(allowed).toBe(false);
    // RPC should NOT be called since UUID extraction failed first
    expect(rpcFn).not.toHaveBeenCalled();
  });

  it("allows request when atomic RPC returns true", async () => {
    const deleteChain = { eq: vi.fn().mockReturnValue({ lt: vi.fn().mockResolvedValue({ error: null }) }) };
    (createServiceClient as Mock).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn().mockReturnValue({ delete: vi.fn().mockReturnValue(deleteChain) }),
    });

    const { checkRateLimit } = await import("./rate-limit");
    const allowed = await checkRateLimit("chat:00000000-0000-4000-8000-000000000001");
    expect(allowed).toBe(true);
  });

  it("denies request when atomic RPC returns false", async () => {
    const deleteChain = { eq: vi.fn().mockReturnValue({ lt: vi.fn().mockResolvedValue({ error: null }) }) };
    (createServiceClient as Mock).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      from: vi.fn().mockReturnValue({ delete: vi.fn().mockReturnValue(deleteChain) }),
    });

    const { checkRateLimit } = await import("./rate-limit");
    const allowed = await checkRateLimit("chat:00000000-0000-4000-8000-000000000001");
    expect(allowed).toBe(false);
  });
});
