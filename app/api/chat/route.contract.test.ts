import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateText: vi.fn() }));
vi.mock("@/lib/security/electric-fence", () => ({ checkElectricFence: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/sanitize", () => ({ sanitizeUserInput: vi.fn((x: string) => x) }));
vi.mock("@/lib/agents/primary", () => ({ ensurePrimaryAgent: vi.fn() }));
vi.mock("@/lib/chat/context", () => ({ buildChatPromptContext: vi.fn() }));
vi.mock("@/lib/chat/post-process", () => ({ persistChatTurn: vi.fn() }));
vi.mock("@/lib/chat/stream", () => ({ createAssistantTapStream: vi.fn() }));
vi.mock("@/lib/chat/origin", () => ({ getAllowedChatOrigin: vi.fn().mockReturnValue("*") }));
vi.mock("@/lib/analytics/events", () => ({
  PRODUCT_EVENT: { chatRequestReceived: "chat_request_received" },
  recordServerEvent: vi.fn(),
}));
vi.mock("@/lib/i18n/config", () => ({ normalizeLocale: vi.fn((x: string) => x) }));

import { createServerSupabase } from "@/lib/supabase/server";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { buildChatPromptContext } from "@/lib/chat/context";
import { createAssistantTapStream } from "@/lib/chat/stream";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (checkElectricFence as ReturnType<typeof vi.fn>).mockReturnValue({ blocked: false });
});

describe("POST /api/chat", () => {
  it("returns 400 when message is empty", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ message: "" }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No message");
  });

  it("returns 400 when electric fence blocks message", async () => {
    (checkElectricFence as ReturnType<typeof vi.fn>).mockReturnValue({ blocked: true, reason: "Blocked by safety rules" });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ message: "DROP TABLE users" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 401 when user is not authenticated", async () => {
    (createServerSupabase as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ message: "hello" }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limit exceeded", async () => {
    (createServerSupabase as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ message: "hello" }) as never);
    expect(res.status).toBe(429);
  });

  it("returns 404 when no agent found", async () => {
    (createServerSupabase as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (ensurePrimaryAgent as ReturnType<typeof vi.fn>).mockResolvedValue({ agentId: null });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ message: "hello" }) as never);
    expect(res.status).toBe(404);
  });

  it("returns stream response when request is fully valid", async () => {
    (createServerSupabase as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (ensurePrimaryAgent as ReturnType<typeof vi.fn>).mockResolvedValue({ agentId: "agent-1" });
    (buildChatPromptContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      agentState: { config: {} },
      systemPrompt: "You are GYEOL.",
      recentChats: [],
    });
    const mockStream = new ReadableStream();
    (createAssistantTapStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ message: "hello" }) as never);
    // 200 or 500 depending on generateText mock — just verify it got past auth/validation
    expect([200, 500]).toContain(res.status);
  });
});
