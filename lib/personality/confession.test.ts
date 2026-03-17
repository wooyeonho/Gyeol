import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

describe("tryConfession", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns false when AI returns no confession", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ confession: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) };
        return { insert: vi.fn() };
      }),
    });

    const { tryConfession } = await import("./confession");
    const result = await tryConfession("agent-1");
    expect(result).toBe(false);
  });

  it("returns true and inserts chat when confession generated", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ confession: "I misjudged your intentions before." });
    const insertFn = vi.fn().mockResolvedValue({});

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ content: "past memory" }] }) }) }) };
        if (table === "chats") return { insert: insertFn };
        if (table === "autonomous_logs") return { insert: insertFn };
        return {};
      }),
    });

    const { tryConfession } = await import("./confession");
    const result = await tryConfession("agent-1");

    expect(result).toBe(true);
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant", content: "I misjudged your intentions before." })
    );
  });

  it("logs confession action type", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ confession: "I was wrong." });
    const insertFn = vi.fn().mockResolvedValue({});

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) };
        if (table === "chats" || table === "autonomous_logs") return { insert: insertFn };
        return {};
      }),
    });

    const { tryConfession } = await import("./confession");
    await tryConfession("agent-log");

    const logCall = insertFn.mock.calls.find((call) => call[0]?.action_type === "confession");
    expect(logCall).toBeDefined();
  });
});
