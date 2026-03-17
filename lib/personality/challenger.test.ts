import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

describe("checkContradictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns early when fewer than 10 memories", async () => {
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "memories") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ content: "few" }] }) }) }) };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }), update: updateFn };
      }),
    });

    const { checkContradictions } = await import("./challenger");
    await checkContradictions("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("stores contradiction question when found", async () => {
    const memories = Array(15).fill({ content: "나는 항상 계획을 잘 지켜요" });
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ found: true, question: "But you said you hate planning last week?" });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "memories") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: memories }) }) }) };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }), update: updateFn };
      }),
    });

    const { checkContradictions } = await import("./challenger");
    await checkContradictions("agent-1");
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ pending_question: "But you said you hate planning last week?" }) })
    );
  });

  it("does nothing when no contradiction found", async () => {
    const memories = Array(15).fill({ content: "consistent message" });
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ found: false, question: null });
    const updateFn = vi.fn();

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "memories") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: memories }) }) }) };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }), update: updateFn };
      }),
    });

    const { checkContradictions } = await import("./challenger");
    await checkContradictions("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });
});
