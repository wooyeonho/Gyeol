import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

describe("/api/auth/me contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns user id when authenticated", async () => {
    (createClient as Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe("u1");
  });

  it("returns 401 when not authenticated", async () => {
    (createClient as Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 on exception", async () => {
    (createClient as Mock).mockRejectedValue(new Error("fail"));
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
