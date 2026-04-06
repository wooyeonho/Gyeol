import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateText: vi.fn() }));
vi.mock("@/lib/ai/embedding", () => ({ generateEmbedding: vi.fn() }));
vi.mock("@/lib/cron-lock", () => ({
  acquireCronLock: vi.fn(),
  releaseCronLock: vi.fn(),
}));
vi.mock("@/lib/autonomy/self-regulation", () => ({
  buildAutonomyCue: vi.fn().mockReturnValue("cue"),
  capText: vi.fn((x: string) => x),
  computeProactiveChance: vi.fn().mockReturnValue(0),
  isMeaningfulAutonomousOutput: vi.fn().mockReturnValue(true),
  isRepetitiveOutput: vi.fn().mockReturnValue(false),
}));
vi.mock("@/lib/autonomy/circadian", () => ({ getCircadianProfile: vi.fn().mockReturnValue({}) }));
vi.mock("@/lib/autonomy/interval-rule", () => ({
  computeIntervalHours: vi.fn().mockReturnValue(6),
  normalizeIntervalRule: vi.fn().mockReturnValue({}),
}));
vi.mock("@/lib/autonomy/heartbeat-planner", () => ({ planHeartbeatAutonomy: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/billing/service", () => ({ getResolvedBillingState: vi.fn() }));
vi.mock("@/lib/ai/sse-parser", () => ({ readSseAssistantText: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));
vi.mock("@/lib/ops/logger", () => ({ logWarn: vi.fn() }));

import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

const CRON_SECRET = "test-secret-heartbeat";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost";
});

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.NEXT_PUBLIC_APP_URL;
});

function makeRequest(secret?: string) {
  return new Request("http://localhost/api/cron/heartbeat", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

describe("GET /api/cron/heartbeat", () => {
  it("returns 401 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("./route");
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 when auth token is wrong", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest("bad-secret") as never);
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
    const mockEqResult = { data: [], single: vi.fn().mockResolvedValue({ data: null }) };
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(mockEqResult) }),
      }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest(CRON_SECRET) as never);
    expect(res.status).toBe(200);
  });
});
