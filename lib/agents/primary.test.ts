import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/genome/dna", () => ({
  generateInitialDNA: vi.fn().mockReturnValue({ trait1: 0.5, trait2: 0.3 }),
}));

vi.mock("@/lib/genome/species", () => ({
  deriveSpecies: vi.fn().mockReturnValue({
    name: "lumen-being",
    archetype: "explorer",
    element: "light",
  }),
}));

import { getPrimaryAgent, ensurePrimaryAgent } from "./primary";

function makeDb(options: {
  agents?: Array<{ id: string; created_at?: string }>;
  insertResult?: { id: string; created_at?: string } | null;
} = {}) {
  const agents = options.agents ?? [];
  const insertResult = options.insertResult ?? null;
  const insertFn = vi.fn().mockResolvedValue({});

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agents") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: agents }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: insertResult }),
          }),
        }),
      };
    }
    if (table === "agent_state") {
      return { insert: insertFn };
    }
    return {};
  });

  return { db: { from }, insertFn };
}

describe("getPrimaryAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns agentId when agent exists", async () => {
    const { db } = makeDb({ agents: [{ id: "agent-1", created_at: "2026-01-01" }] });
    const result = await getPrimaryAgent(db, "user-1");
    expect(result.agentId).toBe("agent-1");
    expect(result.hasMultiple).toBe(false);
  });

  it("returns null agentId when no agents", async () => {
    const { db } = makeDb({ agents: [] });
    const result = await getPrimaryAgent(db, "user-1");
    expect(result.agentId).toBeNull();
  });

  it("detects multiple agents", async () => {
    const { db } = makeDb({
      agents: [
        { id: "agent-1", created_at: "2026-01-01" },
        { id: "agent-2", created_at: "2026-01-02" },
      ],
    });
    const result = await getPrimaryAgent(db, "user-1");
    expect(result.agentId).toBe("agent-1");
    expect(result.hasMultiple).toBe(true);
  });
});

describe("ensurePrimaryAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing agent when one exists", async () => {
    const { db } = makeDb({ agents: [{ id: "existing-agent" }] });
    const result = await ensurePrimaryAgent(db, "user-1");
    expect(result.agentId).toBe("existing-agent");
  });

  it("creates new agent when none exists", async () => {
    const { db, insertFn } = makeDb({
      agents: [],
      insertResult: { id: "new-agent", created_at: "2026-03-01" },
    });
    const result = await ensurePrimaryAgent(db, "user-1");
    expect(result.agentId).toBe("new-agent");
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "new-agent",
        total_messages: 0,
        vitality: 1,
        genome: expect.objectContaining({
          species: "lumen-being",
          archetype: "explorer",
          element: "light",
        }),
      })
    );
  });

  it("returns null when agent creation fails", async () => {
    const { db } = makeDb({ agents: [], insertResult: null });
    const result = await ensurePrimaryAgent(db, "user-1");
    expect(result.agentId).toBeNull();
  });
});
