import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateJSON: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

describe("processHiddenEmotions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("does nothing when generateJSON returns null", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateFn }),
    });

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
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateFn }),
    });

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "How are you?", "I'm fine!");

    expect(updateFn).not.toHaveBeenCalled();
  });

  it("updates hidden_emotions when hiding is true", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      surface: "calm",
      real: "anxious",
      hiding: true,
    });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateFn }),
    });

    const { processHiddenEmotions } = await import("./deception");
    await processHiddenEmotions("agent-1", "I'm totally fine", "Yes, everything is okay.");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        hidden_emotions: expect.objectContaining({
          surface: "calm",
          real: "anxious",
          updated_at: expect.any(String),
        }),
      })
    );
  });

  it("calls generateJSON with user message and AI response", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ hiding: false });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: vi.fn() }),
    });

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
});
