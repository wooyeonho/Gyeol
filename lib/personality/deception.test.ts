import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateJSON: vi.fn(),
}));

vi.mock("@/lib/i18n/config", () => ({
  getLanguageName: vi.fn().mockReturnValue("English"),
}));

vi.mock("@/lib/i18n/generation", () => ({
  resolveGenerationLocale: vi.fn().mockReturnValue("en"),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

function mockDbWithState(
  stateData: Record<string, unknown> | null,
  updateFn: ReturnType<typeof vi.fn>,
  insertFn?: ReturnType<typeof vi.fn>
) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: stateData }),
          }),
        }),
        update: updateFn,
      };
    }
    if (table === "memories") {
      return { insert: insertFn ?? vi.fn().mockResolvedValue({}) };
    }
    return { select: vi.fn().mockResolvedValue({ data: null }) };
  });
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });
}

describe("processHiddenEmotions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("does nothing when agent_state is null", async () => {
    const updateFn = vi.fn();
    mockDbWithState(null, updateFn);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "Hello", "Hi there!");

    expect(generateJSON).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("does nothing when generateJSON returns null", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const updateFn = vi.fn();
    mockDbWithState(
      { hidden_emotions: null, intimacy_score: 20, config: {} },
      updateFn
    );

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "Hello", "Hi there!");

    expect(updateFn).not.toHaveBeenCalled();
  });

  it("does nothing when hiding is false", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      surface: "happy",
      real: "happy",
      hiding: false,
    });
    const updateFn = vi.fn();
    mockDbWithState(
      { hidden_emotions: null, intimacy_score: 20, config: {} },
      updateFn
    );

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "How are you?", "I'm fine!");

    expect(updateFn).not.toHaveBeenCalled();
  });

  it("updates hidden_emotions when hiding is true and intensity exceeds threshold", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      surface: "calm",
      real: "anxious",
      hiding: true,
      intensity: 0.9,
      trigger: "the question",
    });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const insertFn = vi.fn().mockResolvedValue({});
    mockDbWithState(
      { hidden_emotions: null, intimacy_score: 10, config: {} },
      updateFn,
      insertFn
    );

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "I'm totally fine", "Yes, everything is okay.");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        hidden_emotions: expect.objectContaining({
          surface: "calm",
          real: "anxious",
          intensity: 0.9,
          updated_at: expect.any(String),
        }),
      })
    );
  });

  it("skips update when intensity is below intimacy-based threshold", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      surface: "calm",
      real: "anxious",
      hiding: true,
      intensity: 0.2,
    });
    const updateFn = vi.fn();
    mockDbWithState(
      { hidden_emotions: null, intimacy_score: 10, config: {} },
      updateFn
    );

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "test", "response");

    // intensity 0.2 < threshold 0.3 (intimacy 10 means threshold = 0.3)
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("creates suppression memory when intensity > 0.8", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      surface: "calm",
      real: "furious",
      hiding: true,
      intensity: 0.95,
      trigger: "a provocation",
    });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const insertFn = vi.fn().mockResolvedValue({});
    mockDbWithState(
      { hidden_emotions: null, intimacy_score: 5, config: {} },
      updateFn,
      insertFn
    );

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "you are terrible", "That's okay.");

    // Should insert a suppression memory
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-1",
        type: "emotional_suppression",
        content: expect.stringContaining("furious"),
      })
    );
  });

  it("calls generateJSON with user message and AI response", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ hiding: false });
    const updateFn = vi.fn();
    mockDbWithState(
      { hidden_emotions: null, intimacy_score: 20, config: {} },
      updateFn
    );

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "user said this", "ai replied this");

    expect(generateJSON).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("user said this")
    );
    expect(generateJSON).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("ai replied this")
    );
  });

  it("handles null fields in generateJSON response gracefully", async () => {
    // Downstream test: generateJSON returns partial/null fields
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      surface: null,
      real: null,
      hiding: true,
      intensity: null,
      trigger: null,
    });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    mockDbWithState(
      { hidden_emotions: null, intimacy_score: 5, config: {} },
      updateFn
    );

    const { processHiddenEmotions } = await import("./deception");
    // Should not throw
    await processHiddenEmotions("agent-1", "test msg", "test resp");

    // intensity defaults to 0.5 when null, threshold is 0.3 for intimacy=5
    // 0.5 > 0.3, so update should happen with fallback values
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        hidden_emotions: expect.objectContaining({
          surface: "calm",
          real: "uncertain",
          intensity: 0.5,
        }),
      })
    );
  });
});
