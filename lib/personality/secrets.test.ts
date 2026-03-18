import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

function mockDbWithState(
  stateData: Record<string, unknown> | null,
  updateFn: ReturnType<typeof vi.fn>,
  insertFn?: ReturnType<typeof vi.fn>
) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: stateData }),
          }),
        }),
        update: updateFn,
      };
    }
    if (table === "autonomous_logs") {
      return { insert: insertFn ?? vi.fn().mockResolvedValue({}) };
    }
    return { select: vi.fn().mockResolvedValue({ data: null }) };
  });
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock });
}

describe("processSecrets", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("does nothing when AI says keep_secret is not true", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ keep_secret: false, reason: "No need to hide" });
    const updateFn = vi.fn();
    mockDbWithState({ config: {}, secrets: null, intimacy_score: 20 }, updateFn);

    const { processSecrets } = await import("./secrets");
    await processSecrets("agent-1", "Had a strange dream");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("stores secret when AI says keep_secret=true", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      keep_secret: true,
      reason: "Too personal",
      importance: 0.6,
      reveal_when: "when asked directly",
    });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    mockDbWithState({ config: {}, secrets: { entries: [] }, intimacy_score: 20 }, updateFn);

    const { processSecrets } = await import("./secrets");
    await processSecrets("agent-1", "I saw something strange");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        secrets: expect.objectContaining({
          entries: expect.arrayContaining([
            expect.objectContaining({ content: "I saw something strange" }),
          ]),
        }),
      })
    );
  });

  it("appends to existing secrets", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      keep_secret: true,
      reason: "Private",
      importance: 0.5,
    });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const existingEntries = [{ content: "old secret", created_at: "2026-01-01", reveal_condition: "when asked", importance: 0.5, revealed: false }];
    mockDbWithState({ config: {}, secrets: { entries: existingEntries }, intimacy_score: 20 }, updateFn);

    const { processSecrets } = await import("./secrets");
    await processSecrets("agent-1", "new secret experience");

    const calledWith = updateFn.mock.calls[0][0];
    expect(calledWith.secrets.entries).toHaveLength(2);
    expect(calledWith.secrets.entries[1].content).toBe("new secret experience");
  });

  it("does nothing when AI returns null", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const updateFn = vi.fn();
    mockDbWithState({ config: {}, intimacy_score: 10 }, updateFn);

    const { processSecrets } = await import("./secrets");
    await processSecrets("agent-1", "experience");
    expect(updateFn).not.toHaveBeenCalled();
  });
});
