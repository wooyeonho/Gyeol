import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

function mockDashboardService() {
  return {
    from(table: string) {
      if (table === "agents") {
        return {
          select: async () => ({ count: 12 }),
        };
      }
      if (table === "social_logs") {
        return {
          select: async () => ({ count: 33 }),
        };
      }
      if (table === "world_state") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  collective_emotion: { calm: 0.7, joy: 0.3 },
                  weather: { name: "clear" },
                },
              }),
            }),
          }),
        };
      }
      if (table === "artifacts") {
        return {
          select: async () => ({ count: 5 }),
        };
      }
      if (table === "agent_state") {
        return {
          select: async () => ({
            data: [
              { config: { autonomous_enabled: true }, status: "active", last_heartbeat_at: new Date().toISOString(), last_dream_at: new Date().toISOString() },
              { config: { autonomous_enabled: true }, status: "echo", last_heartbeat_at: null, last_dream_at: null },
              { config: { autonomous_enabled: false }, status: "active", last_heartbeat_at: new Date().toISOString(), last_dream_at: new Date().toISOString() },
            ],
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

describe("/api/dashboard contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceClient as Mock).mockReturnValue(mockDashboardService());
  });

  it("returns contract fields with autonomy health", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(typeof body.agent_count).toBe("number");
    expect(typeof body.social_count).toBe("number");
    expect(typeof body.artifact_count).toBe("number");
    expect(Array.isArray(body.cron_freshness)).toBe(true);

    const autonomyHealth = body.autonomy_health as Record<string, unknown>;
    expect(typeof autonomyHealth.score).toBe("number");
    expect(["healthy", "warning", "critical"]).toContain(String(autonomyHealth.tier));
    expect(Array.isArray(autonomyHealth.reasons)).toBe(true);
  });
});
