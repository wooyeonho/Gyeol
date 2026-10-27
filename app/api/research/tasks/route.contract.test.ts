import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: vi.fn(),
}));

vi.mock("@/lib/security/csrf", () => ({
  verifyCsrfOrigin: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { GET, PATCH } from "./route";

describe("/api/research/tasks contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-1" });
  });

  it("returns task list", async () => {
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("research_tasks");
        return {
          select: () => ({
            eq: () => ({
              limit: async () => ({
                data: [{ id: "task-1", title: "정리할 문제", status: "pending", priority: 2 }],
              }),
            }),
          }),
        };
      },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tasks)).toBe(true);
  });

  it("cancels a task", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("research_tasks");
        return ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "task-1", priority: 1 } }),
            }),
          }),
        }),
        update: () => ({
          eq,
        }),
      });
      },
    });

    const taskUuid = "550e8400-e29b-41d4-a716-446655440000";
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "550e8400-e29b-41d4-a716-446655440001", hasState: true });
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        expect(table).toBe("research_tasks");
        return ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: taskUuid, priority: 1 } }),
            }),
          }),
        }),
        update: () => ({
          eq,
        }),
      });
      },
    });

    const res = await PATCH(
      new NextRequest("http://localhost/api/research/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", "Origin": "http://localhost" },
        body: JSON.stringify({ task_id: taskUuid, action: "cancel" }),
      })
    );
    if (res.status !== 200) console.log(await res.text());
    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("id", taskUuid);
  });
});
