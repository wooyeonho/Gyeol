import { describe, it, expect } from "vitest";
import { detectGoalSignal } from "./detector";

describe("detectGoalSignal", () => {
  it("returns no signal for short messages (< 8 chars)", () => {
    const result = detectGoalSignal("안녕");
    expect(result.activeGoal).toBeNull();
    expect(result.priority).toBe(1);
    expect(result.researchFocus).toBeNull();
  });

  it("returns no signal for generic messages with no hints", () => {
    const result = detectGoalSignal("오늘 날씨가 정말 좋네요");
    expect(result.activeGoal).toBeNull();
    expect(result.priority).toBe(1);
    expect(result.researchFocus).toBeNull();
  });

  it("detects goal from 목표 hint", () => {
    const result = detectGoalSignal("내 올해 목표는 새로운 기술을 배우는 것이에요");
    expect(result.activeGoal).not.toBeNull();
    expect(result.priority).toBe(2);
  });

  it("detects goal from 계획 hint", () => {
    const result = detectGoalSignal("다음 달 여행 계획을 세우고 싶어요");
    expect(result.activeGoal).not.toBeNull();
  });

  it("detects goal from 하고 싶 hint", () => {
    const result = detectGoalSignal("나는 개발자가 하고 싶어요");
    expect(result.activeGoal).not.toBeNull();
  });

  it("detects goal from 원해 hint", () => {
    const result = detectGoalSignal("나는 성장하기를 정말 원해요");
    expect(result.activeGoal).not.toBeNull();
  });

  it("detects goal from 준비 hint", () => {
    const result = detectGoalSignal("면접 준비를 어떻게 해야 할까요");
    expect(result.activeGoal).not.toBeNull();
  });

  it("detects research focus from 알아봐 hint", () => {
    const result = detectGoalSignal("최신 AI 트렌드를 좀 알아봐 줄 수 있어?");
    expect(result.researchFocus).not.toBeNull();
    expect(result.activeGoal).not.toBeNull(); // research implies activeGoal
    expect(result.priority).toBe(2);
  });

  it("detects research focus from 조사 hint", () => {
    const result = detectGoalSignal("스타트업 투자 시장을 조사해줘");
    expect(result.researchFocus).not.toBeNull();
    expect(result.priority).toBe(2);
  });

  it("detects research focus from 추천 hint", () => {
    const result = detectGoalSignal("좋은 책 좀 추천해줘요");
    expect(result.researchFocus).not.toBeNull();
  });

  it("elevates priority to 3 with urgency hint 급해", () => {
    const result = detectGoalSignal("내일 발표라 급해서 빨리 정리가 필요해요");
    expect(result.priority).toBe(3);
  });

  it("elevates priority to 3 with 당장 hint", () => {
    const result = detectGoalSignal("당장 이 문제를 해결해야 해요");
    expect(result.priority).toBe(3);
  });

  it("elevates priority to 3 with 긴급 hint", () => {
    const result = detectGoalSignal("긴급하게 처리해야 할 상황이에요");
    expect(result.priority).toBe(3);
  });

  it("elevates priority to 3 with 중요 hint", () => {
    const result = detectGoalSignal("이건 정말 중요한 결정이에요");
    expect(result.priority).toBe(3);
  });

  it("clips long messages to 100 chars for activeGoal", () => {
    const longMessage = "목표는 " + "A".repeat(200);
    const result = detectGoalSignal(longMessage);
    expect(result.activeGoal).not.toBeNull();
    expect(result.activeGoal!.length).toBeLessThanOrEqual(101); // 100 + possible ellipsis
  });

  it("priority 1 when message is generic with no signals", () => {
    const result = detectGoalSignal("오늘 점심에 뭐 먹을까요 고민이에요");
    expect(result.priority).toBe(1);
    expect(result.activeGoal).toBeNull();
  });
});
