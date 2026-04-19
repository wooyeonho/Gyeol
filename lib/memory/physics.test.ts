import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeDb(memories: Array<Record<string, unknown>> = []) {
  // select().eq().eq().eq().order().limit() → memories
  const limitFn = vi.fn().mockResolvedValue({ data: memories, error: null });
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
  const selectEq3 = vi.fn().mockReturnValue({ order: orderFn });
  const selectEq2 = vi.fn().mockReturnValue({ eq: selectEq3 });
  const selectEq1 = vi.fn().mockReturnValue({ eq: selectEq2 });
  const selectFn = vi.fn().mockReturnValue({ eq: selectEq1 });

  // update().in() for archive, update().eq() for weight
  const inFn = vi.fn().mockResolvedValue({});
  const eqFn = vi.fn().mockResolvedValue({});
  const updateFn = vi.fn().mockReturnValue({ in: inFn, eq: eqFn });

  const from = vi.fn().mockImplementation(() => ({
    select: selectFn,
    update: updateFn,
  }));

  return { db: { from }, updateFn, inFn, selectFn };
}

describe("runMemoryPhysics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("deactivates old unreferenced memories", async () => {
    const { db } = makeDb();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { runMemoryPhysics } = await import("./physics");
    await runMemoryPhysics("agent-1");

    expect(db.from).toHaveBeenCalledWith("memories");
  });

  it("does not throw on error", async () => {
    // select returns an error — function should bail out quietly
    const limitFn = vi.fn().mockResolvedValue({ data: null, error: { message: "column not found" } });
    const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
    const selectEq3 = vi.fn().mockReturnValue({ order: orderFn });
    const selectEq2 = vi.fn().mockReturnValue({ eq: selectEq3 });
    const selectEq1 = vi.fn().mockReturnValue({ eq: selectEq2 });
    const selectFn = vi.fn().mockReturnValue({ eq: selectEq1 });
    const from = vi.fn().mockImplementation(() => ({ select: selectFn }));
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { runMemoryPhysics } = await import("./physics");
    await expect(runMemoryPhysics("agent-1")).resolves.not.toThrow();
  });
});

describe("incrementReferenceCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("increments reference count for each memory ID", async () => {
    const updateEq = vi.fn().mockResolvedValue({});
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });
    const selectFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { reference_count: 2 } }),
      }),
    });
    const from = vi.fn().mockReturnValue({ select: selectFn, update: updateFn });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { incrementReferenceCounts } = await import("./physics");
    await incrementReferenceCounts("agent-1", ["mem-1", "mem-2"]);

    expect(updateFn).toHaveBeenCalledWith({ reference_count: 3 });
    expect(updateFn).toHaveBeenCalledTimes(2);
  });

  it("handles empty ids array", async () => {
    const from = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { incrementReferenceCounts } = await import("./physics");
    await incrementReferenceCounts("agent-1", []);
    expect(from).not.toHaveBeenCalled();
  });
});
