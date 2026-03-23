import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateTextOnce: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";

function makeDb(opts: {
  userModel?: Record<string, unknown> | null;
  selfName?: string;
} = {}) {
  const insertFn = vi.fn().mockResolvedValue({});

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_model: opts.userModel ?? null,
                self_name: opts.selfName ?? "TestGyeol",
                config: {},
              },
            }),
          }),
        }),
      };
    }
    if (table === "time_capsules" || table === "autonomous_logs") {
      return { insert: insertFn };
    }
    return {};
  });

  return { db: { from }, insertFn };
}

describe("tryCreateAgentLetter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns false when user_model is insufficient", async () => {
    const { db } = makeDb({ userModel: { speech_patterns: ["yo"], values: [] } });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { tryCreateAgentLetter } = await import("./agent-letter");
    const result = await tryCreateAgentLetter("agent-1");
    expect(result).toBe(false);
    expect(generateTextOnce).not.toHaveBeenCalled();
  });

  it("returns false when user_model is null", async () => {
    const { db } = makeDb({ userModel: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { tryCreateAgentLetter } = await import("./agent-letter");
    const result = await tryCreateAgentLetter("agent-1");
    expect(result).toBe(false);
  });

  it("creates letter when user_model has enough data", async () => {
    const { db, insertFn } = makeDb({
      userModel: {
        speech_patterns: ["yo", "hey"],
        values: ["kindness", "honesty"],
      },
      selfName: "Echo",
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue("Dear future you, stay kind.");

    const { tryCreateAgentLetter } = await import("./agent-letter");
    const result = await tryCreateAgentLetter("agent-1");
    expect(result).toBe(true);
    expect(insertFn).toHaveBeenCalledTimes(2); // time_capsules + autonomous_logs
  });

  it("returns false when AI returns empty message", async () => {
    const { db } = makeDb({
      userModel: {
        speech_patterns: ["x", "y"],
        values: ["a"],
      },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue("");

    const { tryCreateAgentLetter } = await import("./agent-letter");
    const result = await tryCreateAgentLetter("agent-1");
    expect(result).toBe(false);
  });
});
