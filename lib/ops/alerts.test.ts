import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { emitSystemAlert } from "./alerts";

describe("emitSystemAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPS_ALERT_SLACK_WEBHOOK_URL;
    delete process.env.EMAIL_API_URL;
    delete process.env.OPS_ALERT_EMAIL_TO;
  });

  it("skips duplicate alert inside cooldown window", async () => {
    const insertSpy = vi.fn();
    const db = {
      from: (table: string) => {
        if (table !== "system_alerts") throw new Error("unexpected table");
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [{ created_at: new Date().toISOString() }],
                  }),
                }),
              }),
            }),
          }),
          insert: insertSpy,
        };
      },
    };
    (createServiceClient as Mock).mockReturnValue(db);

    const sent = await emitSystemAlert(
      {
        level: "critical",
        source: "cron-health",
        code: "AUTONOMY_HEALTH_CRITICAL",
        message: "critical",
      },
      { cooldownMinutes: 60, notifySlack: true, notifyEmail: true },
    );

    expect(sent).toBe(false);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("writes and notifies when outside cooldown", async () => {
    const insertSpy = vi.fn().mockResolvedValue({});
    const db = {
      from: (table: string) => {
        if (table !== "system_alerts") throw new Error("unexpected table");
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [{ created_at: "2020-01-01T00:00:00.000Z" }],
                  }),
                }),
              }),
            }),
          }),
          insert: insertSpy,
        };
      },
    };
    (createServiceClient as Mock).mockReturnValue(db);
    process.env.OPS_ALERT_SLACK_WEBHOOK_URL = "https://hooks.slack.test/123";
    process.env.EMAIL_API_URL = "https://email.test/send";
    process.env.OPS_ALERT_EMAIL_TO = "ops@example.com";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const sent = await emitSystemAlert(
      {
        level: "critical",
        source: "cron-lifeline",
        code: "JOB_TRIGGER_FAILED",
        message: "failed",
      },
      { cooldownMinutes: 1, notifySlack: true, notifyEmail: true },
    );

    expect(sent).toBe(true);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });
});
