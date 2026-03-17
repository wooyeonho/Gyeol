import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/security/electric-fence", () => ({ checkElectricFence: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/sanitize", () => ({ sanitizeUserInput: vi.fn((x: string) => x) }));
vi.mock("@/lib/api/v1-auth", () => ({
  authorizeV1ApiKey: vi.fn(),
  canAccessAgent: vi.fn(),
  getApiKeyIdentifier: vi.fn().mockReturnValue("key-id"),
}));
vi.mock("@/lib/chat/sync-turn", () => ({ runSynchronousChatTurn: vi.fn() }));

import { authorizeV1ApiKey, canAccessAgent } from "@/lib/api/v1-auth";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { runSynchronousChatTurn } from "@/lib/chat/sync-turn";

function makeRequest(body: unknown, authHeader?: string) {
  return new Request("http://localhost/api/v1/agent/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (checkElectricFence as ReturnType<typeof vi.fn>).mockReturnValue({ blocked: false });
  (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(true);
});

describe("POST /api/v1/agent/chat", () => {
  it("returns 401 when API key is missing", async () => {
    (authorizeV1ApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ agent_id: "a1", message: "hi" }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when agent_id or message is missing", async () => {
    (authorizeV1ApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "key-1", ownerUserId: "u1" });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ message: "hi" }) as never); // missing agent_id
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is empty string", async () => {
    (authorizeV1ApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "key-1", ownerUserId: "u1" });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ agent_id: "a1", message: "" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when electric fence blocks message", async () => {
    (authorizeV1ApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "key-1", ownerUserId: "u1" });
    (checkElectricFence as ReturnType<typeof vi.fn>).mockReturnValue({ blocked: true, reason: "Blocked" });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ agent_id: "a1", message: "DROP TABLE users" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 404 when agent is not found", async () => {
    (authorizeV1ApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "key-1", ownerUserId: "u1" });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
      }),
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ agent_id: "a1", message: "hello" }) as never);
    expect(res.status).toBe(404);
  });

  it("returns 200 with reply on successful chat", async () => {
    (authorizeV1ApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "key-1", ownerUserId: "u1" });
    (canAccessAgent as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "a1", user_id: "u1" } }) }) }),
      }),
    });
    (runSynchronousChatTurn as ReturnType<typeof vi.fn>).mockResolvedValue({ reply: "Hello!" });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ agent_id: "a1", message: "hello" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe("Hello!");
  });
});
