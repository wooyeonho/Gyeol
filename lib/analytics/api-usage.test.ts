import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

describe("recordApiUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("inserts event into product_events table", async () => {
    const insertFn = vi.fn().mockReturnValue({ then: vi.fn((cb: () => void) => cb()) });
    const from = vi.fn().mockReturnValue({ insert: insertFn });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { recordApiUsage } = await import("./api-usage");
    recordApiUsage("/api/chat", "key_abc", { model: "test" });

    expect(from).toHaveBeenCalledWith("product_events");
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "v1_api_call",
        path: "/api/chat",
        properties: expect.objectContaining({
          model: "test",
          api_key_prefix: "key_abc",
        }),
      })
    );
  });

  it("does not throw when service client throws", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("Service unavailable");
    });

    const { recordApiUsage } = await import("./api-usage");
    expect(() => recordApiUsage("/api/test", "key_x", {})).not.toThrow();
  });
});
