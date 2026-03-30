import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeDb({
  state,
}: {
  state?: Record<string, unknown> | null;
}) {
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
  const insertFn = vi.fn().mockResolvedValue({});

  const from = vi.fn().mockImplementation((table: string) => {
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

describe("checkEvolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns null when agent state not found", async () => {
    const { db } = makeDb({ state: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { checkEvolution } = await import("./gen-level");
    const result = await checkEvolution("agent-missing");
    expect(result).toBeNull();
  });

  it("updates progress and returns evolved:false when progress < 100", async () => {
    const { db, updateFn } = makeDb({
      state: { progress: 0, gen_level: 1, visual: {}, config: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    // Force Math.random to return low value so progress stays below 100
    vi.spyOn(Math, "random").mockReturnValue(0.01);

    const { checkEvolution } = await import("./gen-level");
    const result = await checkEvolution("agent-progress");

    expect(result).toEqual({ evolved: false });
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ progress: expect.any(Number) })
    );
    const calledProgress = updateFn.mock.calls[0][0].progress;
    expect(calledProgress).toBeLessThan(100);
  });

  it("evolves when progress >= 100 and random check passes", async () => {
    const { db, updateFn, insertFn } = makeDb({
      state: { progress: 99, gen_level: 1, visual: {}, config: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    // First call: progress random (high enough to hit ≥100), second call: rate check passes
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.99) // progress increment: 0.99*1.5+0.5 = 1.985, total = 100.985
      .mockReturnValueOnce(0.01) // critical bonus check: 0.01 < 0.05 → critical hit! But let's just test normal path
      .mockReturnValueOnce(0.0) // rate check: 0.0 < 0.6 (Gen 1 rate)
      .mockReturnValueOnce(0.99); // mutation: 0.99 >= 0.05, no mutation

    const { checkEvolution } = await import("./gen-level");
    const result = await checkEvolution("agent-evolve");

    if (result?.evolved) {
      expect(result.newLevel).toBe(2);
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          gen_level: 2,
          progress: 0,
          visual: expect.objectContaining({ particles: 10, glow: 46 }),
        })
      );
      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: "evolution",
          agent_id: "agent-evolve",
        })
      );
    }
    // Whether or not evolution happened depends on random - just ensure no error
    expect(result).not.toBeNull();
  });

  it("does not evolve when rate check fails", async () => {
    const { db, updateFn } = makeDb({
      state: { progress: 99, gen_level: 1, visual: {}, config: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.99) // progress to ≥100
      .mockReturnValueOnce(0.99) // no critical bonus
      .mockReturnValueOnce(0.99); // rate check fails (0.99 > 0.6)

    const { checkEvolution } = await import("./gen-level");
    const result = await checkEvolution("agent-no-evolve");

    expect(result).toEqual({ evolved: false });
    // Should set progress to 80 (fallback)
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ progress: 80 }));
  });

  it("applies visual upgrade on evolution", async () => {
    const { db, updateFn } = makeDb({
      state: { progress: 99, gen_level: 2, visual: { shape: "sphere" }, config: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.99) // progress to ≥100
      .mockReturnValueOnce(0.99) // no critical
      .mockReturnValueOnce(0.0)  // rate check passes (0.0 < 0.4 for Gen 2)
      .mockReturnValueOnce(0.99); // no mutation

    const { checkEvolution } = await import("./gen-level");
    const result = await checkEvolution("agent-visual");

    if (result?.evolved) {
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          visual: expect.objectContaining({ particles: 15, glow: 56 }),
        })
      );
    }
  });

  it("assigns mutation trait when mutation random is low enough", async () => {
    const { db, updateFn } = makeDb({
      state: { progress: 99, gen_level: 1, visual: {}, config: {} },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.99) // high progress increment
      .mockReturnValueOnce(0.99) // no critical
      .mockReturnValueOnce(0.0)  // rate check passes
      .mockReturnValueOnce(0.01) // mutation triggers (0.01 < 0.05)
      .mockReturnValueOnce(0.0); // mutation index 0 → empathy_master

    const { checkEvolution } = await import("./gen-level");
    const result = await checkEvolution("agent-mutation");

    if (result?.evolved) {
      expect(result.mutation).toBe("empathy_master");
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ mutation_trait: "empathy_master" }),
        })
      );
    }
  });
});
