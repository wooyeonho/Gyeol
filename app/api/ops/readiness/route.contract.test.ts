import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

function createAuthedClient(userId: string | null) {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: userId ? { id: userId } : null,
        },
      }),
    },
  };
}

function createOpsService() {
  return {
    from(table: string) {
      if (table === "agent_state") {
        return {
          select: async () => ({
            data: [
              { config: { autonomous_enabled: true }, status: "active", last_heartbeat_at: new Date().toISOString(), last_dream_at: new Date().toISOString() },
              { config: { autonomous_enabled: true }, status: "echo", last_heartbeat_at: null, last_dream_at: null },
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
      if (table === "system_alerts") {
        return {
          select: (columns: string) => {
            if (columns.includes("source")) {
              return {
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        level: "critical",
                        source: "cron-health",
                        code: "AUTONOMY_HEALTH_CRITICAL",
                        message: "Autonomy health score is critical",
                        created_at: new Date().toISOString(),
                      },
                    ],
                  }),
                }),
              };
            }
            return {
              gte: async () => ({
                data: [
                  { level: "critical", created_at: new Date().toISOString() },
                  { level: "warning", created_at: new Date().toISOString() },
                ],
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

describe("/api/ops/readiness contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPS_ADMIN_USER_IDS = "user-1";
  });

  it("returns 401 when not logged in", async () => {
    (createClient as Mock).mockResolvedValue(createAuthedClient(null));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    (createClient as Mock).mockResolvedValue(createAuthedClient("user-2"));
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns readiness payload with alert summary fields", async () => {
    (createClient as Mock).mockResolvedValue(createAuthedClient("user-1"));
    (createServiceClient as Mock).mockReturnValue(createOpsService());
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(typeof body.checked_at).toBe("string");
    expect(Array.isArray(body.env_status)).toBe(true);
    expect(Array.isArray(body.recommendations)).toBe(true);
    expect(Array.isArray(body.recent_alerts)).toBe(true);
    expect(typeof body.stripe_configured).toBe("boolean");

    const summary = body.alert_summary_24h as Record<string, unknown>;
    expect(typeof summary.total).toBe("number");
    expect(typeof summary.warning).toBe("number");
    expect(typeof summary.critical).toBe("number");

    const autonomy = body.autonomy_health as Record<string, unknown>;
    expect(typeof autonomy.score).toBe("number");
    expect(["healthy", "warning", "critical"]).toContain(String(autonomy.tier));
  });
});
