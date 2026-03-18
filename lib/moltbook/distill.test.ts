import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/ai/router", () => ({
  generateJSON: vi.fn(),
}));
vi.mock("@/lib/ai/embedding", () => ({
  generateEmbedding: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { distillMemoriesToMoltBook } from "./distill";

function createChain() {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockReturnValue(c);
  c.gte = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.limit = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: null, error: null });
  c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  c.insert = vi.fn().mockResolvedValue({ data: null, error: null });
  return c;
}

describe("distillMemoriesToMoltBook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when no memories found", async () => {
    const stateChain = createChain();
    stateChain.single.mockResolvedValue({ data: { config: {} }, error: null });

    const countChain = createChain();
    countChain.eq.mockResolvedValue({ data: null, count: 0, error: null });

    const memChain = createChain();
    memChain.limit.mockResolvedValue({ data: [], error: null });

    let moltIdx = 0;
    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "agent_state") return stateChain;
      if (table === "moltbook_entries") { moltIdx++; return moltIdx === 1 ? countChain : createChain(); }
      if (table === "memories") return memChain;
      return createChain();
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await distillMemoriesToMoltBook("agent-1");
    expect(result).toBe(0);
  });

  it("creates entries when generateJSON returns valid data", async () => {
    const stateChain = createChain();
    stateChain.single.mockResolvedValue({ data: { config: { preferred_locale: "en" } }, error: null });

    const countChain = createChain();
    countChain.eq.mockResolvedValue({ data: null, count: 5, error: null });

    const memChain = createChain();
    memChain.limit.mockResolvedValue({
      data: [
        { id: "m1", content: "AI models overview", type: "rss_learner", created_at: new Date().toISOString() },
      ],
      error: null,
    });

    const insertChain = createChain();

    let moltIdx = 0;
    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "agent_state") return stateChain;
      if (table === "moltbook_entries") { moltIdx++; return moltIdx === 1 ? countChain : insertChain; }
      if (table === "memories") return memChain;
      return createChain();
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      entries: [{ topic: "AI", summary: "Summary", confidence: 0.8, tags: ["ai"], source_type: "rss" }],
    });
    (generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(new Array(768).fill(0.1));

    const result = await distillMemoriesToMoltBook("agent-2");
    expect(typeof result).toBe("number");
    expect(generateJSON).toHaveBeenCalled();
    expect(generateEmbedding).toHaveBeenCalled();
  });
});
