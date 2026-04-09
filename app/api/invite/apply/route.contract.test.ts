import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: vi.fn(),
}));

vi.mock("@/lib/economy/coins", () => ({
  addCoinsAtomic: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/security/csrf", () => ({
  verifyCsrfOrigin: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { addCoinsAtomic } from "@/lib/economy/coins";
import { POST } from "./route";

describe("/api/invite/apply contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REFERRAL_REWARD_COINS = "10";
  });

  it("rewards inviter on first successful referral", async () => {
    const stateUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const insertReferral = vi.fn().mockResolvedValue({ error: null });
    (createClient as Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "invitee-1" } } }),
      },
    });
    (ensurePrimaryAgent as Mock).mockResolvedValue({ agentId: "agent-inviter" });
    (createServiceClient as Mock).mockReturnValue({
      from(table: string) {
        if (table === "invite_codes") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { user_id: "inviter-1" } }),
              }),
            }),
          };
        }
        if (table === "referrals") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
            insert: insertReferral,
          };
        }
        if (table === "agent_state") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { coins: 5 } }),
              }),
            }),
            update: () => ({
              eq: stateUpdateEq,
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/invite/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "abc123" }),
      })
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.rewarded_coins).toBe(10);
    expect(insertReferral).toHaveBeenCalled();
    // Coin reward now uses addCoinsAtomic RPC instead of direct DB update
    expect(addCoinsAtomic).toHaveBeenCalledWith(
      "agent-inviter",
      10,
      expect.stringContaining("referral"),
    );
  });
});
