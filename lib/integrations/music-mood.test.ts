import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateJSON: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

function makeDb(opts: {
  agentUserId?: string | null;
  connection?: { metadata?: Record<string, unknown> } | null;
  stateConfig?: Record<string, unknown>;
} = {}) {
  const updateEq = vi.fn().mockResolvedValue({});
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { config: opts.stateConfig ?? {} },
            }),
          }),
        }),
        update: updateFn,
      };
    }
    if (table === "agents") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: opts.agentUserId ? { user_id: opts.agentUserId } : null,
            }),
          }),
        }),
      };
    }
    if (table === "user_connections") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: opts.connection ?? null }),
              }),
            }),
          }),
        }),
      };
    }
    return {};
  });

  return { db: { from }, updateFn };
}

describe("tryAnalyzeMusicMood", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns early when no user_id found", async () => {
    const { db } = makeDb({ agentUserId: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { tryAnalyzeMusicMood } = await import("./music-mood");
    await tryAnalyzeMusicMood("agent-1");
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("returns early when no music connection", async () => {
    const { db } = makeDb({ agentUserId: "user-1", connection: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { tryAnalyzeMusicMood } = await import("./music-mood");
    await tryAnalyzeMusicMood("agent-1");
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("returns early when no recent tracks", async () => {
    const { db } = makeDb({
      agentUserId: "user-1",
      connection: { metadata: { recent_tracks: [] } },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { tryAnalyzeMusicMood } = await import("./music-mood");
    await tryAnalyzeMusicMood("agent-1");
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("analyzes tracks and updates config", async () => {
    const { db, updateFn } = makeDb({
      agentUserId: "user-1",
      connection: {
        metadata: { recent_tracks: ["Song A", "Song B", "Song C"] },
      },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      mood_observation: "Listening to melancholic tunes",
    });

    const { tryAnalyzeMusicMood } = await import("./music-mood");
    await tryAnalyzeMusicMood("agent-1");
    expect(generateJSON).toHaveBeenCalledOnce();
    expect(updateFn).toHaveBeenCalled();
  });

  it("skips update when AI returns no observation", async () => {
    const { db, updateFn } = makeDb({
      agentUserId: "user-1",
      connection: { metadata: { recent_tracks: ["Song"] } },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ mood_observation: null });

    const { tryAnalyzeMusicMood } = await import("./music-mood");
    await tryAnalyzeMusicMood("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });
});
