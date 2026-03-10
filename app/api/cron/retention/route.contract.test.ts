import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/cron-auth", () => ({
  checkCronAuth: vi.fn(),
}));

vi.mock("@/lib/cron-lock", () => ({
  acquireCronLock: vi.fn(),
  releaseCronLock: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { checkCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

describe("/api/cron/retention contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRODUCT_EVENTS_RETENTION_DAYS = "90";
  });

  it("returns 401 when cron auth fails", async () => {
    (checkCronAuth as Mock).mockReturnValue(false);
    const response = await GET(new Request("http://localhost/api/cron/retention") as never);
    expect(response.status).toBe(401);
  });

  it("deletes old product events when authorized", async () => {
    (checkCronAuth as Mock).mockReturnValue(true);
    (acquireCronLock as Mock).mockResolvedValue(true);
    (releaseCronLock as Mock).mockResolvedValue(undefined);
    const deleteIn = vi.fn().mockResolvedValue({ error: null });
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        expect(table).toBe("product_events");
        return {
          select: () => ({
            lt: () => ({
              limit: async () => ({
                data: [{ id: "e1" }, { id: "e2" }],
              }),
            }),
          }),
          delete: () => ({
            in: deleteIn,
          }),
        };
      },
    });

    const response = await GET(new Request("http://localhost/api/cron/retention") as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.deleted).toBe(2);
    expect(deleteIn).toHaveBeenCalledWith("id", ["e1", "e2"]);
  });
});
