import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const getUserMock = vi.fn();
const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: fromMock, rpc: rpcMock })),
}));

vi.mock("@/lib/memory/constellations", () => ({
  buildConstellations: vi.fn(async () => []),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function buildMemoriesAndState(memoryRows: unknown[]) {
  const limit = vi.fn().mockResolvedValue({ data: memoryRows });
  const order = vi.fn(() => ({ limit }));
  const eqMem = vi.fn(() => ({ order }));
  const memSelect = vi.fn(() => ({ eq: eqMem }));

  const single = vi.fn().mockResolvedValue({
    data: { config: { language: "ko" } },
  });
  const eqState = vi.fn(() => ({ single }));
  const stateSelect = vi.fn(() => ({ eq: eqState }));

  // agents -> [{ id }]
  const agentsLimit = vi.fn().mockResolvedValue({ data: [{ id: "a1" }] });
  const agentsEq = vi.fn(() => ({ limit: agentsLimit }));
  const agentsSelect = vi.fn(() => ({ eq: agentsEq }));

  fromMock.mockImplementation((table: string) => {
    if (table === "memories") return { select: memSelect };
    if (table === "agent_state") return { select: stateSelect };
    if (table === "agents") return { select: agentsSelect };
    return {};
  });
}

describe("/api/constellation positioning", () => {
  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("produces deterministic z positions across calls", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    buildMemoriesAndState([
      { id: "11111111-1111-1111-1111-111111111111", content: "a", type: "memory", created_at: "2026-01-01" },
      { id: "22222222-2222-2222-2222-222222222222", content: "b", type: "memory", created_at: "2026-01-02" },
      { id: "33333333-3333-3333-3333-333333333333", content: "c", type: "memory", created_at: "2026-01-03" },
    ]);
    const { GET } = await import("./route");
    const res1 = await GET();
    const res2 = await GET();
    const json1 = await (res1 as NextResponse).json();
    const json2 = await (res2 as NextResponse).json();
    expect(json1.stars).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(json1.stars[i].z).toBe(json2.stars[i].z);
    }
  });

  it("keeps depth within [-0.25, 0.25]", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const rows = Array.from({ length: 30 }, (_, i) => ({
      id: `mem-${i.toString().padStart(8, "0")}`,
      content: `c${i}`,
      type: "memory",
      created_at: `2026-02-${(i % 28) + 1}`,
    }));
    buildMemoriesAndState(rows);
    const { GET } = await import("./route");
    const res = await GET();
    const json = await (res as NextResponse).json();
    for (const star of json.stars) {
      expect(star.z).toBeGreaterThanOrEqual(-0.25);
      expect(star.z).toBeLessThanOrEqual(0.25);
    }
  });

  it("returns different z for different memory ids", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    buildMemoriesAndState([
      { id: "alpha", content: "a", type: "memory", created_at: "2026-01-01" },
      { id: "beta", content: "b", type: "memory", created_at: "2026-01-02" },
      { id: "gamma", content: "c", type: "memory", created_at: "2026-01-03" },
    ]);
    const { GET } = await import("./route");
    const res = await GET();
    const json = await (res as NextResponse).json();
    const zs = json.stars.map((s: { z: number }) => s.z);
    // Three distinct ids should yield three distinct depths (vanishingly
    // small collision probability with FNV-1a on these specific inputs).
    const unique = new Set(zs);
    expect(unique.size).toBe(3);
  });
});
