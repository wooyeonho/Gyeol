import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/cron-lock", () => ({
  acquireCronLock: vi.fn(),
  releaseCronLock: vi.fn(),
}));
vi.mock("@/lib/i18n/config", () => ({
  DEFAULT_LOCALE: "ko",
  getLanguageName: vi.fn().mockReturnValue("Korean"),
}));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));
vi.mock("@/lib/sanitize", () => ({ sanitizeUserInput: vi.fn((x: string) => x) }));
vi.mock("@/lib/social/moderation", () => ({
  moderateSocialContent: vi.fn().mockReturnValue({ status: "approved", sanitized: "text" }),
}));
vi.mock("@/lib/safety/age-gate", () => ({ canUsePublicSocial: vi.fn().mockReturnValue(true) }));

import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

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
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const { GET } = await import("./route");
    const res = await GET(makeRequest(CRON_SECRET) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("lock");
  });

  it("returns 200 when lock acquired and no agents", async () => {
    (acquireCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (releaseCronLock as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const { createServiceClient } = await import("@/lib/supabase/service");
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest(CRON_SECRET) as never);
    expect(res.status).toBe(200);
  });
});
