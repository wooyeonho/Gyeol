import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { GET } from "./route";

function mockAuth(userId: string | null = "u1") {
  (createClient as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
  });
}

describe("/api/agent/state contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns agentId and agentState on success", async () => {
    mockAuth();
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "a1", hasMultiple: false });
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { mood: "calm", vitality: 0.8, genome: { dna: [] } } }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.agentId).toBe("a1");
    expect(body.agentState).toHaveProperty("mood");
  });

  it("returns null when no agent", async () => {
    mockAuth();
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: null, hasMultiple: false });
    (createServiceClient as Mock).mockReturnValue({});

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.agentId).toBeNull();
    expect(body.agentState).toBeNull();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
