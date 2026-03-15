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

describe("/api/leaderboard contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns top lists and self context", async () => {
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-2" });
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table === "agent_state") {
          return {
            select: (_query: string, options?: { count?: string; head?: boolean }) => {
              if (options?.head) {
                return Promise.resolve({ count: 3 });
              }
              return {
                limit: async () => ({
                  data: [
                    { agent_id: "agent-1", self_name: "Alpha", gen_level: 5, vitality: 0.8, total_messages: 40, visual: null, config: null },
                    { agent_id: "agent-2", self_name: "Beta", gen_level: 4, vitality: 0.9, total_messages: 35, visual: null, config: null },
                    { agent_id: "agent-3", self_name: "Gamma", gen_level: 3, vitality: 0.7, total_messages: 20, visual: null, config: null },
                  ],
                }),
              };
            },
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Array.isArray(body.byLevel)).toBe(true);
    expect(Array.isArray(body.byMessages)).toBe(true);
    expect(Array.isArray(body.byVitality)).toBe(true);
    expect(typeof body.totalAgents).toBe("number");

    const contexts = body.contexts as Record<string, unknown>;
    const levelContext = contexts.level as Record<string, unknown>;
    expect(levelContext.self).toBeTruthy();
    expect(Array.isArray(levelContext.nearby)).toBe(true);
  });
});
