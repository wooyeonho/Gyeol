import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/agents/primary", () => ({
  ensurePrimaryAgent: vi.fn().mockResolvedValue({ agentId: "inviter-agent" }),
}));

vi.mock("@/lib/economy/coins", () => ({
  addCoinsAtomic: vi.fn().mockResolvedValue(true),
}));

import { applyInviteCodeForUser } from "./apply";

function makeDb(opts: {
  inviteRow?: { user_id: string } | null;
  existingReferral?: { id: string } | null;
  inviterCoins?: number;
} = {}) {
  const insertFn = vi.fn().mockResolvedValue({});
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "invite_codes") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: opts.inviteRow ?? null }),
          }),
        }),
      };
    }
    if (table === "referrals") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: opts.existingReferral ?? null }),
          }),
        }),
        insert: insertFn,
      };
    }
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { coins: opts.inviterCoins ?? 50 } }),
          }),
        }),
        update: updateFn,
      };
    }
    return {};
  });

  return { db: { from } as never, insertFn, updateFn };
}

describe("applyInviteCodeForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns INVALID_CODE when invite code not found", async () => {
    const { db } = makeDb({ inviteRow: null });
    const result = await applyInviteCodeForUser(db, "user-1", "BADCODE");
    expect(result).toEqual({ ok: false, error: "INVALID_CODE" });
  });

  it("returns SELF_REFERRAL when user refers themselves", async () => {
    const { db } = makeDb({ inviteRow: { user_id: "user-1" } });
    const result = await applyInviteCodeForUser(db, "user-1", "MYCODE");
    expect(result).toEqual({ ok: false, error: "SELF_REFERRAL" });
  });

  it("returns 0 coins when referral already exists", async () => {
    const { db } = makeDb({
      inviteRow: { user_id: "inviter-1" },
      existingReferral: { id: "ref-1" },
    });
    const result = await applyInviteCodeForUser(db, "user-1", "CODE123");
    expect(result).toEqual({ ok: true, rewardedCoins: 0 });
  });

  it("creates referral and rewards coins for new valid code", async () => {
    const { addCoinsAtomic } = await import("@/lib/economy/coins");
    const { db, insertFn } = makeDb({
      inviteRow: { user_id: "inviter-1" },
      existingReferral: null,
      inviterCoins: 50,
    });
    const result = await applyInviteCodeForUser(db, "user-2", "CODE123");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rewardedCoins).toBeGreaterThanOrEqual(0);
    }
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        inviter_id: "inviter-1",
        invitee_id: "user-2",
        code: "code123",
      })
    );
    expect(addCoinsAtomic).toHaveBeenCalledWith(
      "inviter-agent",
      expect.any(Number),
      expect.stringContaining("referral"),
    );
  });

  it("normalizes code to lowercase", async () => {
    const { db, insertFn } = makeDb({
      inviteRow: { user_id: "inviter-1" },
      existingReferral: null,
    });
    await applyInviteCodeForUser(db, "user-2", "  CODE123  ");
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ code: "code123" })
    );
  });
});
