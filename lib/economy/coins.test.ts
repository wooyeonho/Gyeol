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
     

    const { db: _db } = makeDb({ coins: undefined as unknown as number });
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

describe("addCoins (deprecated — delegates to addCoinsAtomic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("delegates to addCoinsAtomic RPC", async () => {
    const { db } = makeDb({ rpcResult: true });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { addCoins } = await import("./coins");
    await addCoins("agent-1", 50, "daily reward");

    expect(db.rpc).toHaveBeenCalledWith("add_coins_atomic", expect.objectContaining({
      p_agent_id: "agent-1",
      p_amount: 50,
      p_reason: "daily reward",
    }));
  });
});

describe("spendCoins (deprecated — delegates to spendCoinsAtomic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("delegates to spendCoinsAtomic RPC and returns true", async () => {
    const { db } = makeDb({ rpcResult: true });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { spendCoins } = await import("./coins");
    const result = await spendCoins("agent-1", 30, "buy item");

    expect(result).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("spend_coins_atomic", expect.objectContaining({
      p_agent_id: "agent-1",
      p_amount: 30,
      p_reason: "buy item",
    }));
  });

  it("returns false when RPC reports insufficient balance", async () => {
    const { db } = makeDb({ rpcResult: false });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { spendCoins } = await import("./coins");
    const result = await spendCoins("agent-1", 50, "buy expensive item");

    expect(result).toBe(false);
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
