import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeDb({
  coins = 100,
  rpcResult,
  rpcError,
}: {
  coins?: number;
  rpcResult?: boolean;
  rpcError?: boolean;
} = {}) {
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
  const insertFn = vi.fn().mockResolvedValue({});
  const rpcFn = vi.fn().mockResolvedValue(
    rpcError
      ? { data: null, error: new Error("RPC unavailable") }
      : { data: rpcResult ?? true, error: null }
  );

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { coins } }) }) }),
        update: updateFn,
      };
    }
    if (table === "autonomous_logs") {
      return { insert: insertFn };
    }
    return {};
  });

  return { db: { from, rpc: rpcFn }, updateFn, insertFn, rpcFn };
}

describe("getBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns the agent's coin balance", async () => {
    const { db } = makeDb({ coins: 250 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { getBalance } = await import("./coins");
    const balance = await getBalance("agent-1");
    expect(balance).toBe(250);
  });

  it("returns 0 when coins field is null", async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }),
      }),
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { getBalance } = await import("./coins");
    const balance = await getBalance("agent-null");
    expect(balance).toBe(0);
  });
});

describe("addCoins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("adds coins to current balance", async () => {
    const { db, updateFn } = makeDb({ coins: 100 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { addCoins } = await import("./coins");
    await addCoins("agent-1", 50, "daily reward");

    expect(updateFn).toHaveBeenCalledWith({ coins: 150 });
  });

  it("logs the coins_add action", async () => {
    const { db, insertFn } = makeDb({ coins: 100 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { addCoins } = await import("./coins");
    await addCoins("agent-1", 25, "task completed");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-1",
        action_type: "coins_add",
        summary: expect.stringContaining("25"),
      })
    );
  });
});

describe("spendCoins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns true and deducts when balance is sufficient", async () => {
    const { db, updateFn } = makeDb({ coins: 100 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { spendCoins } = await import("./coins");
    const result = await spendCoins("agent-1", 30, "buy item");

    expect(result).toBe(true);
    expect(updateFn).toHaveBeenCalledWith({ coins: 70 });
  });

  it("returns false when balance is insufficient", async () => {
    const { db, updateFn } = makeDb({ coins: 10 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { spendCoins } = await import("./coins");
    const result = await spendCoins("agent-1", 50, "buy expensive item");

    expect(result).toBe(false);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("logs the coins_spend action when successful", async () => {
    const { db, insertFn } = makeDb({ coins: 200 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { spendCoins } = await import("./coins");
    await spendCoins("agent-1", 100, "premium feature");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-1",
        action_type: "coins_spend",
      })
    );
  });
});

describe("spendCoinsAtomic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns RPC result when RPC succeeds", async () => {
    const { db } = makeDb({ rpcResult: true });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { spendCoinsAtomic } = await import("./coins");
    const result = await spendCoinsAtomic("agent-1", 50, "test");

    expect(result).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("spend_coins_atomic", expect.objectContaining({
      p_agent_id: "agent-1",
      p_amount: 50,
    }));
  });

  it("returns false from RPC when insufficient balance", async () => {
    const { db } = makeDb({ rpcResult: false });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { spendCoinsAtomic } = await import("./coins");
    const result = await spendCoinsAtomic("agent-1", 999, "test");

    expect(result).toBe(false);
  });

  it("throws when RPC fails (no unsafe fallback)", async () => {
    const rpcFn = vi.fn().mockResolvedValue({ data: null, error: { message: "Function not found" } });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: rpcFn });

    const { spendCoinsAtomic } = await import("./coins");
    await expect(spendCoinsAtomic("agent-1", 50, "test")).rejects.toThrow("spend_coins_atomic RPC failed");
  });
});

describe("addCoinsAtomic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("uses RPC when available and returns true", async () => {
    const { db } = makeDb({ rpcResult: true });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { addCoinsAtomic } = await import("./coins");
    const result = await addCoinsAtomic("agent-1", 100, "test add");

    expect(result).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("add_coins_atomic", expect.objectContaining({
      p_agent_id: "agent-1",
      p_amount: 100,
    }));
  });

  it("throws when RPC fails (no unsafe fallback)", async () => {
    const rpcFn = vi.fn().mockResolvedValue({ data: null, error: { message: "RPC not found" } });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: rpcFn });

    const { addCoinsAtomic } = await import("./coins");
    await expect(addCoinsAtomic("agent-1", 75, "test")).rejects.toThrow("add_coins_atomic RPC failed");
  });
});
