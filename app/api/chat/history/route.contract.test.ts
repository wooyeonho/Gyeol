import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: vi.fn(),
}));

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { GET } from "./route";

function mockAuth(userId: string | null = "u1") {
  (createServerSupabase as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
  });
}

describe("/api/chat/history contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns messages array on success", async () => {
    mockAuth();
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "a1" });
    (createServiceClient as Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  { role: "user", content: "Hello", created_at: "2025-01-01T00:00:00Z" },
                  { role: "assistant", content: "Hi!", created_at: "2025-01-01T00:00:01Z" },
                ],
              }),
            }),
          }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: Array<{ role: string; content: string }> };
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBe(2);
    expect(body.messages[0]).toHaveProperty("role");
    expect(body.messages[0]).toHaveProperty("content");
  });

  it("returns empty messages when no agent", async () => {
    mockAuth();
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: null });
    (createServiceClient as Mock).mockReturnValue({});
    const res = await GET();
    const body = (await res.json()) as { messages: unknown[] };
    expect(body.messages).toEqual([]);
  });

  it("returns 401 when unauthorized", async () => {
    mockAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
