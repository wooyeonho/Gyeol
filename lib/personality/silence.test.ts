import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeDb({ lastChatHoursAgo, hasPendingQuestion = false }: { lastChatHoursAgo: number | null; hasPendingQuestion?: boolean }) {
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
  const lastChatData = lastChatHoursAgo !== null
    ? [{ created_at: new Date(Date.now() - lastChatHoursAgo * 3600000).toISOString() }]
    : [];

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "chats") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: lastChatData }),
          }),
        }),
      };
    }
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                config: hasPendingQuestion ? { pending_question: "existing question" } : {},
              },
            }),
          }),
        }),
        update: updateFn,
      };
    }
    return {};
  });

  return { db: { from }, updateFn };
}

describe("detectSilence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("does nothing when there is no recent chat record", async () => {
    const { db, updateFn } = makeDb({ lastChatHoursAgo: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { detectSilence } = await import("./silence");
    await detectSilence("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("does nothing when last chat was less than 72 hours ago", async () => {
    const { db, updateFn } = makeDb({ lastChatHoursAgo: 48 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { detectSilence } = await import("./silence");
    await detectSilence("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("sets pending_question when silent for > 72 hours", async () => {
    const { db, updateFn } = makeDb({ lastChatHoursAgo: 96 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { detectSilence } = await import("./silence");
    await detectSilence("agent-1");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ pending_question: expect.any(String) }),
      })
    );
  });

  it("does not overwrite existing pending_question", async () => {
    const { db, updateFn } = makeDb({ lastChatHoursAgo: 100, hasPendingQuestion: true });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { detectSilence } = await import("./silence");
    await detectSilence("agent-existing-question");

    // Should not update because pending_question already exists
    expect(updateFn).not.toHaveBeenCalled();
  });
});
