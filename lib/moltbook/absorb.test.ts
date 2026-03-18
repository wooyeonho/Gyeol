import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/ai/embedding", () => ({
  generateEmbedding: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { absorbSharedKnowledge } from "./absorb";

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const defaultChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const from = vi.fn().mockReturnValue(defaultChain);
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
  return { from, chain: defaultChain };
}

describe("absorbSharedKnowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when entry does not exist", async () => {
    mockSupabase();
    const result = await absorbSharedKnowledge("agent-1", "nonexistent-entry");
    expect(result).toBe(false);
  });

  it("returns false when absorbing own entry", async () => {
    const { chain } = mockSupabase();
    chain.single.mockResolvedValueOnce({
      data: {
        id: "entry-1",
        agent_id: "agent-1",
        topic: "Test",
        summary: "Test summary",
        source_type: "self",
        confidence: 0.8,
        tags: [],
        embedding: null,
      },
      error: null,
    });

    const result = await absorbSharedKnowledge("agent-1", "entry-1");
    expect(result).toBe(false);
  });
});
