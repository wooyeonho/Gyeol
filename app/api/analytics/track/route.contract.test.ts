import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { POST } from "./route";

describe("/api/analytics/track contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid client event and stores it", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("product_events");
        return { insert };
      },
    });

    const request = new Request("http://localhost/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "http://localhost/features",
        "User-Agent": "vitest",
      },
      body: JSON.stringify({
        anonymous_id: "anon-1",
        event_name: "page_view",
        locale: "ko",
        path: "/features",
        properties: { source: "route_change" },
        session_id: "session-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(202);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown client events", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
    });
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({ insert }),
    });

    const request = new Request("http://localhost/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_name: "totally_unknown_event" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
});
