import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const fromMock = vi.fn();
const ensurePrimaryAgentMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: fromMock })),
}));

vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: ensurePrimaryAgentMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function buildSelectChain(rows: unknown[]) {
  // Chain: from().select().eq().eq().order().limit() — returns { data, error }
  const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
  const order = vi.fn(() => ({ limit }));
  const eqType = vi.fn(() => ({ order }));
  const eqAgent = vi.fn(() => ({ eq: eqType }));
  const select = vi.fn(() => ({ eq: eqAgent }));
  fromMock.mockReturnValue({ select });
}

describe("/api/dreams contract", () => {
  it("returns 401 when no user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/dreams"));
    expect(res.status).toBe(401);
  });

  it("returns empty dreams when no primary agent", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    ensurePrimaryAgentMock.mockResolvedValue({ agentId: null });
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/dreams"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dreams).toEqual([]);
  });

  it("returns normalized dream rows on success", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    ensurePrimaryAgentMock.mockResolvedValue({ agentId: "a1" });
    buildSelectChain([
      {
        id: "d1",
        title: "Dream journal",
        content: "I saw a star...",
        created_at: "2026-01-01T00:00:00Z",
        is_preserved: true,
      },
      {
        id: "d2",
        title: null,
        content: null,
        created_at: null,
        is_preserved: null,
      },
    ]);
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/dreams"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dreams).toHaveLength(2);
    expect(body.dreams[0]).toMatchObject({
      id: "d1",
      title: "Dream journal",
      content: "I saw a star...",
      is_preserved: true,
    });
    // Null/missing fields are coerced to safe defaults
    expect(body.dreams[1]).toMatchObject({
      id: "d2",
      title: null,
      content: "",
      is_preserved: false,
    });
    expect(typeof body.dreams[1].created_at).toBe("string");
  });

  it("caps the limit parameter at 100", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    ensurePrimaryAgentMock.mockResolvedValue({ agentId: "a1" });
    const limitCalls: number[] = [];
    const limit = vi.fn().mockImplementation((n: number) => {
      limitCalls.push(n);
      return Promise.resolve({ data: [], error: null });
    });
    const order = vi.fn(() => ({ limit }));
    const eqType = vi.fn(() => ({ order }));
    const eqAgent = vi.fn(() => ({ eq: eqType }));
    const select = vi.fn(() => ({ eq: eqAgent }));
    fromMock.mockReturnValue({ select });

    const { GET } = await import("./route");
    await GET(new NextRequest("http://localhost/api/dreams?limit=9999"));
    expect(limitCalls[0]).toBe(100);
  });
});
