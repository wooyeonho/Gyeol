import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

describe("processPromises", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("does nothing when no promises exist", async () => {
    const updateFn = vi.fn();
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { promises: [] } }) }) }),
          update: updateFn,
        };
      }
      return { insert: vi.fn().mockResolvedValue({}) };
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { processPromises } = await import("./promises");
    await processPromises("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("does nothing when promise due_date is in the future", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    const updateFn = vi.fn();
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { promises: [{ content: "Future promise", due_date: futureDate, fulfilled: false }] },
          }) }) }),
          update: updateFn,
        };
      }
      return { insert: vi.fn().mockResolvedValue({}) };
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { processPromises } = await import("./promises");
    await processPromises("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("sends reminder message when promise due_date has passed", async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    const insertFn = vi.fn().mockResolvedValue({});
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { promises: [{ content: "Learn a new skill", due_date: pastDate, fulfilled: false }] },
          }) }) }),
          update: updateFn,
        };
      }
      if (table === "chats") return { insert: insertFn };
      return {};
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { processPromises } = await import("./promises");
    await processPromises("agent-1");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "assistant",
        content: expect.stringContaining("Learn a new skill"),
      })
    );
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        promises: expect.arrayContaining([
          expect.objectContaining({ fulfilled: true }),
        ]),
      })
    );
  });

  it("skips already fulfilled promises", async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const insertFn = vi.fn().mockResolvedValue({});
    const updateFn = vi.fn();

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
            data: { promises: [{ content: "Already done", due_date: pastDate, fulfilled: true }] },
          }) }) }),
          update: updateFn,
        };
      }
      if (table === "chats") return { insert: insertFn };
      return {};
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { processPromises } = await import("./promises");
    await processPromises("agent-1");

    // fulfilled=true stays, no chat insert
    expect(insertFn).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });
});
