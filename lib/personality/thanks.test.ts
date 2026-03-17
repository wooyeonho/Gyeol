import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

describe("tryThanks", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns false when AI returns no thanks", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ thanks: null });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) };
        return { insert: vi.fn() };
      }),
    });

    const { tryThanks } = await import("./thanks");
    const result = await tryThanks("agent-1");
    expect(result).toBe(false);
  });

  it("returns true and inserts chat with thanks message", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ thanks: "Thank you for sharing your stories with me." });
    const insertFn = vi.fn().mockResolvedValue({});

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ content: "memory" }] }) }) }) };
        if (table === "chats" || table === "autonomous_logs") return { insert: insertFn };
        return {};
      }),
    });

    const { tryThanks } = await import("./thanks");
    const result = await tryThanks("agent-1");

    expect(result).toBe(true);
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant", content: "Thank you for sharing your stories with me." })
    );
  });

  it("logs thanks action type", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ thanks: "Grateful." });
    const insertFn = vi.fn().mockResolvedValue({});

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) };
        if (table === "chats" || table === "autonomous_logs") return { insert: insertFn };
        return {};
      }),
    });

    const { tryThanks } = await import("./thanks");
    await tryThanks("agent-log");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: "thanks" })
    );
  });
});
