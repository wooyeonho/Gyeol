import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/router", () => ({
  generateJSON: vi.fn(),
}));

vi.mock("@/lib/i18n/config", () => ({
  getLanguageName: vi.fn().mockReturnValue("Korean"),
}));

vi.mock("@/lib/i18n/generation", () => ({
  resolveGenerationLocale: vi.fn().mockReturnValue("ko"),
}));

import { generateJSON } from "@/lib/ai/router";

describe("planNextResearchStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed NextStepPlan from AI response", async () => {
    const mockPlan = {
      active_goal: "AI 분야 전문가 되기",
      next_task: "LLM 아키텍처 논문 읽기",
      priority: 2,
      self_observation: "나는 체계적으로 학습하고 있다",
    };
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(mockPlan);

    const { planNextResearchStep } = await import("./next-step-planner");
    const result = await planNextResearchStep({
      activeGoal: "AI 전문가 되기",
      completedTask: "ChatGPT API 기본 사용법 조사",
      resultSummary: "OpenAI API 사용법 이해 완료",
    });

    expect(result).toEqual(mockPlan);
    expect(result?.active_goal).toBe("AI 분야 전문가 되기");
    expect(result?.next_task).toBe("LLM 아키텍처 논문 읽기");
    expect(result?.priority).toBe(2);
  });

  it("returns null when AI returns null", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { planNextResearchStep } = await import("./next-step-planner");
    const result = await planNextResearchStep({
      activeGoal: null,
      completedTask: "기본 조사",
      resultSummary: "완료",
    });

    expect(result).toBeNull();
  });

  it("handles undefined activeGoal gracefully", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      next_task: "다음 단계 조사",
    });

    const { planNextResearchStep } = await import("./next-step-planner");
    const result = await planNextResearchStep({
      completedTask: "기초 조사",
      resultSummary: "완료",
    });

    expect(result?.next_task).toBe("다음 단계 조사");
  });

  it("calls generateJSON with correct task info", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { planNextResearchStep } = await import("./next-step-planner");
    await planNextResearchStep({
      activeGoal: "스타트업 창업",
      completedTask: "시장 조사",
      resultSummary: "경쟁사 분석 완료",
    });

    expect(generateJSON).toHaveBeenCalledWith(
      expect.stringContaining("planning"),
      expect.stringContaining("스타트업 창업")
    );
  });

  it("returns plan with all optional fields", async () => {
    const fullPlan = {
      active_goal: "목표",
      identity_statement: "나는 성장하는 중",
      long_term_goal: "장기 비전",
      next_task: "다음 할 일",
      priority: 3 as const,
      role_shift: "역할 변화",
      self_observation: "자기 관찰",
    };
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(fullPlan);

    const { planNextResearchStep } = await import("./next-step-planner");
    const result = await planNextResearchStep({
      completedTask: "완료된 작업",
      resultSummary: "결과 요약",
    });

    expect(result).toEqual(fullPlan);
  });
});
