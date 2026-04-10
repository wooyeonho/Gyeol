import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/security/csrf", () => ({
  verifyCsrfOrigin: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    child: vi.fn(() => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { GET, POST } from "./route";

function mockAuth(userId: string | null = "user-1") {
  (createClient as Mock).mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  });
}

describe("GET /api/social/stories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stories from the RPC call", async () => {
    const mockStories = [
      {
        id: "story-1",
        creature_name: "Lumi",
        content: "Exploring caves!",
        mood: "curious",
        created_at: "2026-01-01T00:00:00Z",
        expires_at: "2026-01-02T00:00:00Z",
      },
    ];

    (createServiceClient as Mock).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stories: unknown[] };
    expect(Array.isArray(body.stories)).toBe(true);
    expect(body.stories).toHaveLength(1);
    expect((body.stories[0] as Record<string, unknown>).creature_name).toBe("Lumi");
  });

  it("returns demo stories when the RPC fails", async () => {
    (createServiceClient as Mock).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "function does not exist" },
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stories: unknown[] };
    expect(Array.isArray(body.stories)).toBe(true);
    expect(body.stories.length).toBeGreaterThan(0);
  });
});

describe("POST /api/social/stories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth(null);

    const request = new Request("http://localhost/api/social/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creature_name: "Lumi",
        content: "Hello!",
        mood: "happy",
      }),
    });

    const res = await POST(request as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid (missing required fields)", async () => {
    mockAuth();
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        if (table === "agents") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { id: "agent-1" } }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/social/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creature_name: "" }),
    });

    const res = await POST(request as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when mood is not a valid value", async () => {
    mockAuth();
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        if (table === "agents") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { id: "agent-1" } }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/social/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creature_name: "Lumi",
        content: "Hello!",
        mood: "furious",
      }),
    });

    const res = await POST(request as never);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockAuth();
    (checkRateLimit as Mock).mockResolvedValueOnce(false);
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        if (table === "agents") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { id: "agent-1" } }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/social/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creature_name: "Lumi",
        content: "Hello!",
        mood: "happy",
      }),
    });

    const res = await POST(request as never);
    expect(res.status).toBe(429);
  });

  it("returns 201 on successful story creation", async () => {
    mockAuth();
    const createdStory = {
      id: "story-new",
      creature_name: "Lumi",
      content: "A wonderful day!",
      mood: "happy",
      created_at: "2026-01-01T00:00:00Z",
      expires_at: "2026-01-02T00:00:00Z",
    };

    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        if (table === "agents") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { id: "agent-1" } }),
              }),
            }),
          };
        }
        if (table === "creature_stories") {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: createdStory, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/social/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creature_name: "Lumi",
        content: "A wonderful day!",
        mood: "happy",
      }),
    });

    const res = await POST(request as never);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; story: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.story.creature_name).toBe("Lumi");
    expect(body.story.mood).toBe("happy");
  });

  it("returns 404 when user has no agent", async () => {
    mockAuth();
    (createServiceClient as Mock).mockReturnValue({
      from: (table: string) => {
        if (table === "agents") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const request = new Request("http://localhost/api/social/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creature_name: "Lumi",
        content: "Hello!",
        mood: "happy",
      }),
    });

    const res = await POST(request as never);
    expect(res.status).toBe(404);
  });
});
