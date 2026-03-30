import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/economy/coins", () => ({
  getBalance: vi.fn(),
  spendCoinsAtomic: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getBalance, spendCoinsAtomic } from "@/lib/economy/coins";
import { GET, POST } from "./route";

function mockAuth(userId: string | null = "u1") {
  (createClient as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
  });
}

function mockService(agentId: string | null = "a1") {
  const insertFn = vi.fn().mockResolvedValue({});
  (createServiceClient as Mock).mockReturnValue({
    from: (table: string) => {
      if (table === "agents") {
        return {
          select: () => ({
            eq: () => ({
              limit: async () => ({ data: agentId ? [{ id: agentId }] : [] }),
            }),
          }),
        };
      }
      if (table === "redemption_requests") {
        return {
          insert: insertFn,
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [{ id: "r1", coins_amount: 100, krw_requested: 1000, status: "pending", created_at: "2025-01-01" }] }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  });
  return { insertFn };
}

describe("/api/earnings/redeem contract", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("GET", () => {
    it("returns redemption requests", async () => {
      mockAuth();
      mockService();
      const res = await GET();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { requests: unknown[]; rate: number };
      expect(Array.isArray(body.requests)).toBe(true);
      expect(typeof body.rate).toBe("number");
    });

    it("returns 401 when unauthorized", async () => {
      mockAuth(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  describe("POST", () => {
    it("returns 400 when coins < 100", async () => {
      mockAuth();
      const req = new Request("http://localhost/api/earnings/redeem", {
        method: "POST",
        body: JSON.stringify({ coins: 50 }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("returns 400 when insufficient balance", async () => {
      mockAuth();
      mockService();
      (getBalance as Mock).mockResolvedValue(50);
      const req = new Request("http://localhost/api/earnings/redeem", {
        method: "POST",
        body: JSON.stringify({ coins: 200 }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("redeems coins successfully", async () => {
      mockAuth();
      const { insertFn } = mockService();
      (getBalance as Mock).mockResolvedValue(500);
      (spendCoinsAtomic as Mock).mockResolvedValue(true);
      const req = new Request("http://localhost/api/earnings/redeem", {
        method: "POST",
        body: JSON.stringify({ coins: 200 }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; krw_requested: number };
      expect(body.ok).toBe(true);
      expect(body.krw_requested).toBe(2000);
      expect(insertFn).toHaveBeenCalled();
    });
  });
});
