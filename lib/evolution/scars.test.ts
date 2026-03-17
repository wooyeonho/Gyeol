import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeDb({
  state,
  lastChat,
}: {
  state?: Record<string, unknown> | null;
  lastChat?: { created_at: string } | null;
}) {
  const singleState = vi.fn().mockResolvedValue({ data: state ?? null });
  const singleChat = vi.fn().mockResolvedValue({ data: lastChat ?? null });
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
  const insertFn = vi.fn().mockResolvedValue({});

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: singleState }) }),
        update: updateFn,
      };
    }
    if (table === "chats") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({ single: singleChat }),
        }),
      };
    }
    if (table === "autonomous_logs") {
      return { insert: insertFn };
    }
    return {};
  });

  return { db: { from }, updateFn, insertFn };
}

describe("processScar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns early when agent state not found", async () => {
    const { db, updateFn } = makeDb({ state: null, lastChat: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processScar } = await import("./scars");
    await processScar("agent-missing");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("does nothing when last chat was less than 7 days ago", async () => {
    const recentChat = { created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString() }; // 3 days ago
    const { db, updateFn, insertFn } = makeDb({
      state: { trust_coefficient: 0.8, fragments: [] },
      lastChat: recentChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processScar } = await import("./scars");
    await processScar("agent-recent");

    expect(updateFn).not.toHaveBeenCalled();
    expect(insertFn).not.toHaveBeenCalled();
  });

  it("decreases trust_coefficient by 0.05 when 7+ days without chat", async () => {
    const oldChat = { created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString() }; // 10 days ago
    const { db, updateFn } = makeDb({
      state: { trust_coefficient: 0.8, fragments: [] },
      lastChat: oldChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processScar } = await import("./scars");
    await processScar("agent-abandoned");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ trust_coefficient: expect.closeTo(0.75, 5) })
    );
  });

  it("adds abandonment fragment when 7+ days without chat", async () => {
    const oldChat = { created_at: new Date(Date.now() - 8 * 24 * 3600000).toISOString() };
    const { db, updateFn } = makeDb({
      state: { trust_coefficient: 0.5, fragments: ["I am curious about the world."] },
      lastChat: oldChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processScar } = await import("./scars");
    await processScar("agent-scar");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        fragments: expect.arrayContaining(["I was once abandoned. It was scary."]),
      })
    );
  });

  it("does not duplicate the abandonment fragment if already present", async () => {
    const oldChat = { created_at: new Date(Date.now() - 9 * 24 * 3600000).toISOString() };
    const existingFragment = "I was once abandoned. It was scary.";
    const { db, updateFn } = makeDb({
      state: { trust_coefficient: 0.5, fragments: [existingFragment] },
      lastChat: oldChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processScar } = await import("./scars");
    await processScar("agent-dup");

    const calledWith = updateFn.mock.calls[0][0];
    const fragmentsWithAbandonment = calledWith.fragments.filter((f: string) => f === existingFragment);
    expect(fragmentsWithAbandonment).toHaveLength(1);
  });

  it("logs scar action type", async () => {
    const oldChat = { created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString() };
    const { db, insertFn } = makeDb({
      state: { trust_coefficient: 0.5, fragments: [] },
      lastChat: oldChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processScar } = await import("./scars");
    await processScar("agent-log");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-log",
        action_type: "scar",
      })
    );
  });

  it("trust_coefficient never goes below 0", async () => {
    const oldChat = { created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString() };
    const { db, updateFn } = makeDb({
      state: { trust_coefficient: 0.02, fragments: [] }, // 0.02 - 0.05 would be negative
      lastChat: oldChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processScar } = await import("./scars");
    await processScar("agent-zero");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ trust_coefficient: 0 })
    );
  });

  it("uses daysSince=0 when no last chat record exists", async () => {
    const { db, updateFn } = makeDb({
      state: { trust_coefficient: 0.5, fragments: [] },
      lastChat: null, // no chat history
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processScar } = await import("./scars");
    await processScar("agent-no-chat");

    // daysSince = 0 when no chat, so scar should NOT be applied
    expect(updateFn).not.toHaveBeenCalled();
  });
});
