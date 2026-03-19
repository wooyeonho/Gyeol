import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateTextOnce: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";

function makeDb(opts: {
  totalMessages?: number;
  sandbox?: Record<string, unknown>;
  recentChats?: Array<{ content: string }>;
} = {}) {
  const insertFn = vi.fn().mockResolvedValue({});
  const updateEq = vi.fn().mockResolvedValue({});
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                total_messages: opts.totalMessages ?? 100,
                sandbox: opts.sandbox ?? {},
              },
            }),
          }),
        }),
        update: updateFn,
      };
    }
    if (table === "chats") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: opts.recentChats ?? [],
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "autonomous_logs") {
      return { insert: insertFn };
    }
    return {};
  });

  return { db: { from }, insertFn, updateFn };
}

describe("attemptSelfModification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("skips when totalMessages < 50", async () => {
    const { db } = makeDb({ totalMessages: 10 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { attemptSelfModification } = await import("./self-modify");
    await attemptSelfModification("agent-1");
    // Should not reach AI generation
    expect(generateTextOnce).not.toHaveBeenCalled();
  });

  it("skips when no matching phrases found", async () => {
    const { db } = makeDb({
      totalMessages: 100,
      recentChats: [{ content: "Hello how are you" }],
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { attemptSelfModification } = await import("./self-modify");
    await attemptSelfModification("agent-1");
    expect(generateTextOnce).not.toHaveBeenCalled();
  });

  it("generates tool when weather phrase is found", async () => {
    const { db, updateFn, insertFn } = makeDb({
      totalMessages: 100,
      recentChats: [{ content: "check the weather please" }],
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue("function getWeather() { return 'sunny'; }");

    const { attemptSelfModification } = await import("./self-modify");
    await attemptSelfModification("agent-1");

    expect(generateTextOnce).toHaveBeenCalledOnce();
    expect(updateFn).toHaveBeenCalled();
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-1",
        action_type: "self_modification",
      })
    );
  });

  it("skips when AI returns empty code", async () => {
    const { db, updateFn } = makeDb({
      totalMessages: 100,
      recentChats: [{ content: "what time is it" }],
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue("");

    const { attemptSelfModification } = await import("./self-modify");
    await attemptSelfModification("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("skips when state is null", async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { attemptSelfModification } = await import("./self-modify");
    await attemptSelfModification("agent-1");
    expect(generateTextOnce).not.toHaveBeenCalled();
  });
});
