import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateJSON: vi.fn(),
}));

vi.mock("@/lib/i18n/config", () => ({
  getLanguageName: vi.fn().mockReturnValue("Korean"),
}));

vi.mock("@/lib/i18n/generation", () => ({
  resolveGenerationLocale: vi.fn().mockReturnValue("ko"),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

function makeDb({
  chats,
  state,
}: {
  chats?: Array<{ content: string }> | null;
  state?: Record<string, unknown> | null;
}) {
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
  const insertFn = vi.fn().mockResolvedValue({});

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "chats") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: chats ?? null }),
          }),
        }),
      };
    }
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: state ?? null }) }),
        }),
        update: updateFn,
      };
    }
    if (table === "autonomous_logs") {
      return { insert: insertFn };
    }
    return {};
  });

  return { db: { from }, updateFn, insertFn };
}

describe("analyzePersonality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns early when fewer than 5 chats", async () => {
    const { db, updateFn } = makeDb({
      chats: [{ content: "Hello" }, { content: "Hi" }], // only 2
      state: { config: {}, fragments: [], mood: "neutral", visual: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-few");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("returns early when no agent state found", async () => {
    const chats = Array(10).fill({ content: "test message" });
    const { db, updateFn } = makeDb({ chats, state: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-no-state");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("returns early when generateJSON returns null", async () => {
    const chats = Array(10).fill({ content: "test message" });
    const { db, updateFn } = makeDb({
      chats,
      state: { config: {}, fragments: [], mood: "neutral", visual: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-null-ai");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("updates mood from AI result", async () => {
    const chats = Array(10).fill({ content: "I am very happy today!" });
    const { db, updateFn } = makeDb({
      chats,
      state: { config: {}, fragments: [], mood: "neutral", visual: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      mood: "happy",
      tone_suggestion: "playful",
    });

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-mood");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ mood: "happy" })
    );
  });

  it("updates tone in config from AI result", async () => {
    const chats = Array(10).fill({ content: "Let me think more formally about this." });
    const { db, updateFn } = makeDb({
      chats,
      state: { config: { some_other_key: true }, fragments: [], mood: "neutral", visual: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      tone_suggestion: "formal",
    });

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-tone");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ tone: "formal", some_other_key: true }),
      })
    );
  });

  it("adds new fragment to list", async () => {
    const chats = Array(10).fill({ content: "I love learning new things." });
    const { db, updateFn } = makeDb({
      chats,
      state: { config: {}, fragments: ["I am curious."], mood: "neutral", visual: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      new_fragment: "I find joy in discovery.",
    });

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-fragment");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        fragments: expect.arrayContaining(["I am curious.", "I find joy in discovery."]),
      })
    );
  });

  it("keeps only last 20 fragments", async () => {
    const chats = Array(10).fill({ content: "hello" });
    const existingFragments = Array(20).fill(null).map((_, i) => `Fragment ${i}`);
    const { db, updateFn } = makeDb({
      chats,
      state: { config: {}, fragments: existingFragments, mood: "neutral", visual: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      new_fragment: "New important insight",
    });

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-cap");

    const calledFragments = updateFn.mock.calls[0][0].fragments;
    expect(calledFragments).toHaveLength(20);
    expect(calledFragments[calledFragments.length - 1]).toBe("New important insight");
  });

  it("does not add fragment when new_fragment is 'null' string", async () => {
    const chats = Array(10).fill({ content: "hello" });
    const { db, updateFn } = makeDb({
      chats,
      state: { config: {}, fragments: ["existing"], mood: "neutral", visual: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      mood: "sad",
      new_fragment: "null", // the string "null" should be ignored
    });

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-null-frag");

    const calledWith = updateFn.mock.calls[0][0];
    // fragments key should not be in updates since new_fragment === "null"
    expect(calledWith.fragments).toBeUndefined();
  });

  it("updates visual settings from AI result", async () => {
    const chats = Array(10).fill({ content: "feeling blue today" });
    const { db, updateFn } = makeDb({
      chats,
      state: { config: {}, fragments: [], mood: "neutral", visual: { glow: 60 } },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      visual_suggestion: { color: "#0000ff", animation: "breathe-slow" },
    });

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-visual");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        visual: expect.objectContaining({ color: "#0000ff", animation: "breathe-slow", glow: 60 }),
      })
    );
  });

  it("logs personality_evolution action", async () => {
    const chats = Array(10).fill({ content: "hello world" });
    const { db, insertFn } = makeDb({
      chats,
      state: { config: {}, fragments: [], mood: "neutral", visual: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ mood: "happy" });

    const { analyzePersonality } = await import("./personality");
    await analyzePersonality("agent-log");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-log",
        action_type: "personality_evolution",
      })
    );
  });
});
