import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeDb() {
  const _eqFn = vi.fn().mockReturnThis();
  const ltFn = vi.fn().mockResolvedValue({});
  const selectFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { reference_count: 3 } }),
    }),
  });

  // Chain: update().eq().eq().lt()
  const chainedEq1 = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ lt: ltFn }) });
  const chainedUpdate = vi.fn().mockReturnValue({ eq: chainedEq1 });

  const from = vi.fn().mockImplementation(() => ({
    update: chainedUpdate,
    select: selectFn,
  }));

  return { db: { from }, updateFn: chainedUpdate, ltFn, selectFn };
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
    const from = vi.fn().mockImplementation(() => ({
      update: _updateFn.mockImplementation(() => {
        throw new Error("column not found");
      }),
    }));
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
    const _updateFn = vi.fn().mockReturnValue({ eq: updateEq });
    const selectFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { reference_count: 2 } }),
      }),
    });
    const from = vi.fn().mockReturnValue({ select: selectFn, update: _updateFn });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { incrementReferenceCounts } = await import("./physics");
    await incrementReferenceCounts("agent-1", ["mem-1", "mem-2"]);

    expect(_updateFn).toHaveBeenCalledWith({ reference_count: 3 });
    expect(_updateFn).toHaveBeenCalledTimes(2);
  });

  it("handles empty ids array", async () => {
    const from = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { incrementReferenceCounts } = await import("./physics");
    await incrementReferenceCounts("agent-1", []);
    expect(from).not.toHaveBeenCalled();
  });
});
