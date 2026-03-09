import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/cron-auth", () => ({
  checkCronAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ops/alerts", () => ({
  emitSystemAlert: vi.fn().mockResolvedValue(true),
}));

import { checkCronAuth } from "@/lib/cron-auth";
import { emitSystemAlert } from "@/lib/ops/alerts";
import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

function mockHealthService() {
  let agentStateCalls = 0;
  return {
    from(table: string) {
      if (table === "agents") {
        return {
          select: async () => ({ count: 10 }),
        };
      }
      if (table === "agent_state") {
        agentStateCalls += 1;
        if (agentStateCalls === 1) {
          return {
            select: async () => ({ data: [{ config: { autonomous_enabled: true } }, { config: { autonomous_enabled: false } }] }),
          };
        }
        if (agentStateCalls === 2) {
          return {
            select: () => ({
              eq: async () => ({ data: [{ agent_id: "a" }, { agent_id: "b" }] }),
            }),
          };
        }
        if (agentStateCalls === 3) {
          return {
            select: () => ({
              lt: () => ({
                neq: async () => ({ data: [{ agent_id: "a", vitality: 0.2 }] }),
              }),
            }),
          };
        }
        if (agentStateCalls === 4) {
          return {
            select: () => ({
              or: async () => ({ data: [{ agent_id: "a" }, { agent_id: "b" }, { agent_id: "c" }, { agent_id: "d" }] }),
            }),
          };
        }
        if (agentStateCalls === 5) {
          return {
            select: () => ({
              or: async () => ({ data: [{ agent_id: "a" }, { agent_id: "b" }, { agent_id: "c" }] }),
            }),
          };
        }
        return {
          select: () => ({
            or: async () => ({ data: [{ agent_id: "a" }, { agent_id: "b" }] }),
          }),
        };
      }
      if (table === "cron_job_locks") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                { job_name: "cron:heartbeat", updated_at: new Date().toISOString() },
                { job_name: "cron:dream", updated_at: "2020-01-01T00:00:00.000Z" },
              ],
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

describe("/api/cron/health contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    (checkCronAuth as Mock).mockReturnValue(false);
    const res = await GET({} as never);
    expect(res.status).toBe(401);
  });

  it("returns health payload and emits warning alert on degraded score", async () => {
    (checkCronAuth as Mock).mockReturnValue(true);
    (createServiceClient as Mock).mockReturnValue(mockHealthService());

    const res = await GET({} as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body.ok).toBe(true);
    expect(typeof body.agents_total).toBe("number");
    expect(typeof body.agents_stale_heartbeat_6h).toBe("number");
    expect(Array.isArray(body.cron_freshness)).toBe(true);

    const autonomyHealth = body.autonomy_health as Record<string, unknown>;
    expect(typeof autonomyHealth.score).toBe("number");
    expect(["healthy", "warning", "critical"]).toContain(String(autonomyHealth.tier));

    expect((emitSystemAlert as Mock).mock.calls.length).toBeGreaterThan(0);
  });
});
