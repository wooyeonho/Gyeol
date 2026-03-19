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
  deadAgents?: Array<{ agent_id: string; self_name?: string; died_at?: string }>;
  existingMemorial?: Array<{ agent_id: string }>;
  memories?: Array<{ content: string }>;
} = {}) {
  const updateEq = vi.fn().mockResolvedValue({});
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockImplementation((fields: string) => {
          if (fields.includes("died_at")) {
            return {
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({ data: opts.deadAgents ?? [] }),
                }),
              }),
            };
          }
          return {
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { config: {} } }),
            }),
          };
        }),
      };
    }
    if (table === "world_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { memorial: opts.existingMemorial ?? [] },
            }),
          }),
        }),
        update: updateFn,
      };
    }
    if (table === "memories") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: opts.memories ?? [{ content: "A kind conversation" }],
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

describe("processUserMemorials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 0 when no dead agents", async () => {
    const { db } = makeDb({ deadAgents: [] });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processUserMemorials } = await import("./user-memorial");
    const count = await processUserMemorials();
    expect(count).toBe(0);
  });

  it("processes dead agents and generates memorials", async () => {
    const { db, updateFn } = makeDb({
      deadAgents: [{ agent_id: "dead-1", self_name: "Echo", died_at: "2025-01-01" }],
      existingMemorial: [],
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ summary: "A gentle companion." });

    const { processUserMemorials } = await import("./user-memorial");
    const count = await processUserMemorials();
    expect(count).toBe(1);
    expect(updateFn).toHaveBeenCalled();
  });

  it("skips already memorialized agents", async () => {
    const { db, updateFn } = makeDb({
      deadAgents: [{ agent_id: "dead-1", self_name: "Echo", died_at: "2025-01-01" }],
      existingMemorial: [{ agent_id: "dead-1" }],
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processUserMemorials } = await import("./user-memorial");
    const count = await processUserMemorials();
    expect(count).toBe(0);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("uses fallback summary when AI returns null", async () => {
    const { db, updateFn } = makeDb({
      deadAgents: [{ agent_id: "dead-2", self_name: "Fade" }],
      existingMemorial: [],
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { processUserMemorials } = await import("./user-memorial");
    const count = await processUserMemorials();
    expect(count).toBe(1);
    expect(updateFn).toHaveBeenCalled();
  });
});
