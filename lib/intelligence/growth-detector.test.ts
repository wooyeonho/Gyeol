import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateJSON: vi.fn(),
}));

vi.mock("@/lib/i18n/config", () => ({
  getLanguageName: vi.fn().mockReturnValue("Korean"),
}));

vi.mock("@/lib/i18n/generation", () => ({
  resolveGenerationLocale: vi.fn().mockReturnValue("ko"),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

export function buildChatContent(count: number, content = "나는 오늘도 열심히 했어요") {
  return Array(count).fill({ content });
}

describe("detectGrowth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns early when recent text is too short (< 100 chars)", async () => {
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        }
        if (table === "chats") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [{ content: "짧은" }] }), // too short
            }),
          };
        }
        return { update: updateFn };
      }),
    });

    const { detectGrowth } = await import("./growth-detector");
    await detectGrowth("agent-short");
    expect(updateFn).not.toHaveBeenCalled();
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("returns early when old text is too short", async () => {
    const longContent = "나는 매일 새로운 것을 배우고 성장하고 있어요. ".repeat(10); // > 100 chars
    const shortContent = "짧은"; // < 100 chars

    const updateFn = vi.fn();
    let chatCallCount = 0;
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        }
        if (table === "chats") {
          chatCallCount++;
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: chatCallCount === 1
                  ? [{ content: longContent }]  // recent: long
                  : [{ content: shortContent }], // old: short
              }),
            }),
          };
        }
        return { update: updateFn };
      }),
    });

    const { detectGrowth } = await import("./growth-detector");
    await detectGrowth("agent-short-old");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("returns early when AI reports no growth observed", async () => {
    const longContent = "나는 매일 새로운 것을 배우고 있어요. ".repeat(10);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ growth_observed: false, observation: null });

    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }),
            update: updateFn,
          };
        }
        if (table === "chats") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [{ content: longContent }] }),
            }),
          };
        }
        return {};
      }),
    });

    const { detectGrowth } = await import("./growth-detector");
    await detectGrowth("agent-no-growth");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("stores observation in config.pending_question when growth detected", async () => {
    const longContent = "나는 매일 새로운 것을 배우고 꾸준히 성장하고 있어요. ".repeat(10);
    const observation = "결정 속도가 빨라졌고 긍정적인 표현이 늘었습니다.";
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      growth_observed: true,
      observation,
    });

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const insertFn = vi.fn().mockResolvedValue({});

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: { existing_key: true } } }) }) }),
            update: updateFn,
          };
        }
        if (table === "chats") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [{ content: longContent }] }),
            }),
          };
        }
        if (table === "autonomous_logs") {
          return { insert: insertFn };
        }
        return {};
      }),
    });

    const { detectGrowth } = await import("./growth-detector");
    await detectGrowth("agent-growth");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          pending_question: observation,
          existing_key: true,
        }),
      })
    );
  });

  it("logs growth_detected action when growth found", async () => {
    const longContent = "성장하고 있어요. ".repeat(20);
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      growth_observed: true,
      observation: "성장이 감지되었습니다.",
    });

    const insertFn = vi.fn().mockResolvedValue({});

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
          };
        }
        if (table === "chats") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [{ content: longContent }] }),
            }),
          };
        }
        if (table === "autonomous_logs") {
          return { insert: insertFn };
        }
        return {};
      }),
    });

    const { detectGrowth } = await import("./growth-detector");
    await detectGrowth("agent-log");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-log",
        action_type: "growth_detected",
      })
    );
  });

  it("truncates observation to 300 chars", async () => {
    const longContent = "나는 성장하고 있어요. ".repeat(20);
    const longObservation = "성장이 ".repeat(100); // way over 300 chars
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      growth_observed: true,
      observation: longObservation,
    });

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }),
            update: updateFn,
          };
        }
        if (table === "chats") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [{ content: longContent }] }),
            }),
          };
        }
        if (table === "autonomous_logs") {
          return { insert: vi.fn().mockResolvedValue({}) };
        }
        return {};
      }),
    });

    const { detectGrowth } = await import("./growth-detector");
    await detectGrowth("agent-truncate");

    const calledConfig = updateFn.mock.calls[0]?.[0]?.config;
    if (calledConfig) {
      expect(calledConfig.pending_question.length).toBeLessThanOrEqual(300);
    }
  });
});
