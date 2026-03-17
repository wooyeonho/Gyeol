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
import { updateUserModel } from "./digital-twin";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateUserModel", () => {
  it("returns false when memory count < 300", async () => {
    const stateChain = {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }),
    };

    const memoryCountChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 50 }),
      }),
    };

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return stateChain;
        if (table === "memories") return memoryCountChain;
        return {};
      }),
    });

    const result = await updateUserModel("agent-few-memories");
    expect(result).toBe(false);
  });

  it("returns false when fewer than 50 conversation texts", async () => {
    const sparseConvos = Array(10).fill({ content: "hello" });

    // select mock shared across calls to from("memories")
    const memSelect = vi.fn();
    memSelect
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ count: 300 }) }) // count query
      .mockReturnValue({ // conversation query
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: sparseConvos }),
      });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        }
        if (table === "memories") {
          return { select: memSelect };
        }
        return {};
      }),
    });

    const result = await updateUserModel("agent-sparse");
    expect(result).toBe(false);
  });

  it("returns false when generateJSON returns null", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const manyConvos = Array(60).fill({ content: "나는 AI에 관심이 많아요" });

    const convChain: Record<string, ReturnType<typeof vi.fn>> = {};
    convChain.eq = vi.fn().mockReturnValue(convChain);
    convChain.order = vi.fn().mockReturnValue(convChain);
    convChain.limit = vi.fn().mockResolvedValue({ data: manyConvos });

    // select is created ONCE outside mockImplementation so mockReturnValueOnce
    // survives across multiple calls to from("memories")
    const memSelect = vi.fn();
    memSelect
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ count: 400 }) }) // count query
      .mockReturnValue(convChain); // conversation query

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
        }
        if (table === "memories") {
          return { select: memSelect };
        }
        return {};
      }),
    });

    const result = await updateUserModel("agent-null-ai");
    expect(result).toBe(false);
  });

  it("merges new patterns with existing user_model", async () => {
    const mockAIResult = {
      speech_patterns: ["간결한 표현 선호", "질문형 문장 자주 사용"],
      values: ["효율성", "창의성"],
      decision_patterns: ["데이터 기반 결정"],
    };
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(mockAIResult);

    const existingUserModel = {
      speech_patterns: ["기존 패턴"],
      values: ["기존 가치관"],
      decision_patterns: [],
    };

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const manyConvos = Array(60).fill({ content: "나는 생각이 많은 편이에요" });

    const convChain: Record<string, ReturnType<typeof vi.fn>> = {};
    convChain.eq = vi.fn().mockReturnValue(convChain);
    convChain.order = vi.fn().mockReturnValue(convChain);
    convChain.limit = vi.fn().mockResolvedValue({ data: manyConvos });

    // select OUTSIDE mockImplementation so call count is preserved
    const memSelect = vi.fn();
    memSelect
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ count: 400 }) }) // count query
      .mockReturnValue(convChain); // conversation query

    let agentStateCallCount = 0;
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          agentStateCallCount++;
          if (agentStateCallCount === 1) {
            return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
          }
          if (agentStateCallCount === 2) {
            return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { user_model: existingUserModel } }) }) }) };
          }
          return { update: updateFn };
        }
        if (table === "memories") {
          return { select: memSelect };
        }
        return {};
      }),
    });

    const result = await updateUserModel("agent-merge");
    expect(result).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_model: expect.objectContaining({
          speech_patterns: expect.arrayContaining(["기존 패턴", "간결한 표현 선호"]),
          values: expect.arrayContaining(["기존 가치관", "효율성"]),
        }),
      })
    );
  });
});
