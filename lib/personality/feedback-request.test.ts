import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeDb({ totalMessages = 0, updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }), insertFn = vi.fn().mockResolvedValue({}) } = {}) {
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { total_messages: totalMessages, config: {} } }) }) }),
        update: updateFn,
      };
    }
    if (table === "autonomous_logs") return { insert: insertFn };
    return {};
  });
  return { db: { from }, updateFn, insertFn };
}

describe("maybeRequestFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns false when total_messages < 100", async () => {
    const { db } = makeDb({ totalMessages: 50 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { maybeRequestFeedback } = await import("./feedback-request");
    const result = await maybeRequestFeedback("agent-1");
    expect(result).toBe(false);
  });

  it("returns false when random check fails (>= 0.01)", async () => {
    const { db } = makeDb({ totalMessages: 200 });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    vi.spyOn(Math, "random").mockReturnValue(0.5); // 0.5 >= 0.01 → skip

    const { maybeRequestFeedback } = await import("./feedback-request");
    const result = await maybeRequestFeedback("agent-1");
    expect(result).toBe(false);
  });

  it("returns true and sets pending_question when total > 100 and random passes", async () => {
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const insertFn = vi.fn().mockResolvedValue({});
    const { db } = makeDb({ totalMessages: 150, updateFn, insertFn });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    vi.spyOn(Math, "random").mockReturnValue(0.005); // 0.005 < 0.01 → trigger

    const { maybeRequestFeedback } = await import("./feedback-request");
    const result = await maybeRequestFeedback("agent-1");

    expect(result).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ pending_question: expect.stringContaining("hurt") }),
      })
    );
  });

  it("logs feedback_request action when triggered", async () => {
    const insertFn = vi.fn().mockResolvedValue({});
    const { db } = makeDb({ totalMessages: 200, insertFn });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    vi.spyOn(Math, "random").mockReturnValue(0.001);

    const { maybeRequestFeedback } = await import("./feedback-request");
    await maybeRequestFeedback("agent-feedback");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-feedback",
        action_type: "feedback_request",
      })
    );
  });
});
