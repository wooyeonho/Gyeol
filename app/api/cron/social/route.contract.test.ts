import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/cron-core", () => ({
  executeSocial: vi.fn(),
}));

import { executeSocial } from "@/lib/cron-core";

const CRON_SECRET = "test-secret-social";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

function makeRequest(secret?: string) {
  return new Request("http://localhost/api/cron/social", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

describe("GET /api/cron/social", () => {
  it("returns 401 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("./route");
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 when auth token is wrong", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest("wrong-secret") as never);
    expect(res.status).toBe(401);
  });

  it("returns 200 with skipped when lock is held", async () => {
    (executeSocial as ReturnType<typeof vi.fn>).mockResolvedValue({
      processed: 0,
      skipped: "lock",
      timestamp: new Date().toISOString(),
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest(CRON_SECRET) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("lock");
  });

  it("returns 200 when lock acquired and no agents", async () => {
    (executeSocial as ReturnType<typeof vi.fn>).mockResolvedValue({
      processed: 0,
      timestamp: new Date().toISOString(),
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest(CRON_SECRET) as never);
    expect(res.status).toBe(200);
  });
});
