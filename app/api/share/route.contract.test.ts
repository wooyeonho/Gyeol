import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: "u1" } },
          }),
      },
    })
  ),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [{ id: "a1" }] }),
      insert: vi.fn().mockResolvedValue({}),
    })),
  })),
}));

vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: vi.fn(() => Promise.resolve({ agentId: "a1" })),
}));

vi.mock("@/lib/security/csrf", () => ({
  verifyCsrfOrigin: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe("/api/share contract", () => {
  it("returns url and slug on POST", async () => {
    const { POST } = await import("./route");
    const res = await POST(new NextRequest("http://localhost/api/share", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.url).toBe("string");
    expect(typeof body.slug).toBe("string");
    expect(body.url).toContain("/share/");
  });
});
