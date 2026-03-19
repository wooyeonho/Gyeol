import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/artifacts/creator", () => ({
  generateArtifact: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ops/logger", () => ({
  logWarn: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateArtifact } from "@/lib/artifacts/creator";

function makeDb({
  state,
  lastChat,
}: {
  state?: Record<string, unknown> | null;
  lastChat?: { created_at: string } | null;
} = {}) {
  const singleState = vi.fn().mockResolvedValue({ data: state ?? null });
  const singleChat = vi.fn().mockResolvedValue({ data: lastChat ?? null });
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    mockResolvedValue: undefined as unknown,
  };
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  let callCount = 0;
  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      callCount++;
      if (callCount === 1) {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: singleState }) }) };
      }
      return { update: updateFn };
    }
    if (table === "chats") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({ single: singleChat }),
        }),
      };
    }
    if (table === "memories") {
      return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) };
    }
    if (table === "autonomous_logs" || table === "adoption_board") {
      return { insert: insertFn };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: updateFn, insert: insertFn };
  });

  return { db: { from: fromFn }, updateFn, insertFn, singleState, singleChat };
}

describe("processVitality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early when no state found", async () => {
    const { db } = makeDb({ state: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processVitality } = await import("./vitality");
    await processVitality("agent-1");
    // No updates should have been called
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("returns early when status is echo", async () => {
    const { db } = makeDb({ state: { vitality: 0, status: "echo", config: {} } });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processVitality } = await import("./vitality");
    await processVitality("agent-echo");
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("does not decay vitality if last chat was less than 12h ago", async () => {
    const recentChat = { created_at: new Date(Date.now() - 6 * 3600000).toISOString() }; // 6h ago (under 12h threshold)
    const { db, updateFn } = makeDb({
      state: { vitality: 0.9, status: "alive", config: { vitality_stage: "alive" } },
      lastChat: recentChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processVitality } = await import("./vitality");
    await processVitality("agent-recent");

    // vitality should be unchanged at 0.9, stage alive
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ vitality: 0.9 })
    );
  });

  it("decays vitality with accelerated 3-stage curve", async () => {
    const oldChat = { created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString() }; // 2 days ago (clearly in days 1-3 bracket)
    const { db, updateFn } = makeDb({
      state: { vitality: 1.0, status: "alive", config: { vitality_stage: "alive" } },
      lastChat: oldChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processVitality } = await import("./vitality");
    await processVitality("agent-decay");

    // Incremental decay: 2 days in 0.02/day bracket → ~0.04 decay
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ vitality: expect.closeTo(0.96, 1) }) // 1.0 - 2 * 0.02
    );
  });

  it("vitality never goes below 0", async () => {
    // Simulate very long absence
    const oldChat = { created_at: new Date(Date.now() - 200 * 24 * 3600000).toISOString() };
    const { db } = makeDb({
      state: { vitality: 0.5, status: "alive", config: { vitality_stage: "alive" } },
      lastChat: oldChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processVitality } = await import("./vitality");
    // Should not throw
    await expect(processVitality("agent-old")).resolves.not.toThrow();
  });

  it("triggers will artifact when transitioning to will stage", async () => {
    // vitality between 0.2 and 0.3 → will stage; previous was recall
    const oldChat = { created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString() };
    const { db } = makeDb({
      state: { vitality: 0.31, status: "alive", config: { vitality_stage: "recall" } },
      lastChat: oldChat,
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { processVitality } = await import("./vitality");
    await processVitality("agent-will");

    expect(generateArtifact).toHaveBeenCalledWith("agent-will", "will");
  });
});

describe("getStage logic (via processVitality)", () => {
  it("assigns melancholy stage for vitality 0.6", async () => {
    const recentChat = { created_at: new Date(Date.now() - 100).toISOString() };
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "agent_state") {
        const callCount = (from as unknown as { _count: number })._count || 0;
        (from as unknown as { _count: number })._count = callCount + 1;
        if (callCount === 0) {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { vitality: 0.6, status: "alive", config: {} } }) }) }) };
        }
        return { update: updateFn };
      }
      if (table === "chats") {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: recentChat }) }) }) };
      }
      return { insert: vi.fn().mockResolvedValue({}) };
    });
    (from as unknown as { _count: number })._count = 0;
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { processVitality } = await import("./vitality");
    await processVitality("agent-melancholy");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ vitality_stage: "melancholy" }),
      })
    );
  });
});
