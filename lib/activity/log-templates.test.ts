import { describe, expect, it } from "vitest";
import { renderLogSummary, renderLogSummaryPublic } from "./log-templates";

describe("renderLogSummary — legacy English prefixes are parsed and localized", () => {
  it("research_task_completed (crawl variant)", () => {
    const out = renderLogSummary(
      "research_task_completed",
      "Research task completed via crawl: Adaptive ethical frameworks",
      "ko",
    );
    expect(out).toBe("리서치 과제를 마쳤어요 — Adaptive ethical frameworks");
  });

  it("research_task_completed (learner variant)", () => {
    expect(
      renderLogSummary("research_task_completed", "Research task completed: Weather patterns", "en"),
    ).toBe("Finished a research task — Weather patterns");
  });

  it("social_encounter parses name and opening line", () => {
    expect(
      renderLogSummary("social_encounter", "Met Aria: 안녕, 오늘은 어땠어?", "ko"),
    ).toBe("Aria을(를) 만났어요 — 안녕, 오늘은 어땠어?");
  });

  it("moltbook_share parses topic and recipient", () => {
    expect(
      renderLogSummary("moltbook_share", 'Shared knowledge "bread recipes" with Mira.', "ko"),
    ).toBe("Mira에게 지식 “bread recipes”을(를) 나눴어요.");
  });

  it("market_purchase parses item and price", () => {
    expect(
      renderLogSummary("market_purchase", "Purchased Moonstone Pendant for 120 coins", "ko"),
    ).toBe("Moonstone Pendant을(를) 120코인에 구매했어요.");
  });

  it("market_sale parses item and price", () => {
    expect(
      renderLogSummary("market_sale", "Sold Moonstone Pendant for 96 coins (after fee)", "en"),
    ).toBe("Sold Moonstone Pendant for 96 coins (after fee).");
  });

  it("heartbeat_task_created strips prefix", () => {
    expect(
      renderLogSummary("heartbeat_task_created", "Autonomous task created: learn star names", "ko"),
    ).toBe("스스로 새 과제를 세웠어요 — learn star names");
  });

  it("emotion_image strips prefix and trailing period", () => {
    expect(renderLogSummary("emotion_image", "Inferred emotion: melancholy.", "ko")).toBe(
      "감정 “melancholy”을(를) 이미지로 남겼어요.",
    );
  });

  it("self_naming captures the chosen name", () => {
    expect(
      renderLogSummary("self_naming", "Named self: 소울. Reason: 소리가 맑아서", "ko"),
    ).toBe("스스로 이름을 지었어요 — 소울");
  });

  it("npc_created captures the NPC name", () => {
    expect(
      renderLogSummary("npc_created", "NPC agent Mira seeded into the world", "en"),
    ).toBe("A new Gyeol, Mira, arrived in the world.");
  });

  it("static English strings (confession) become locale sentences", () => {
    expect(renderLogSummary("confession", "Admitted past misjudgment.", "ko")).toBe(
      "지난 판단을 돌아보고 인정했어요.",
    );
  });

  it("passthrough when no matching action_type (LLM content preserved)", () => {
    expect(renderLogSummary("dream", "하늘에서 은빛 물고기가 떨어졌다.", "ko")).toBe(
      "하늘에서 은빛 물고기가 떨어졌다.",
    );
  });

  it("passthrough when extractor can't match the legacy prefix", () => {
    // garbled historical row — we show the cleaned content rather than hide it
    expect(renderLogSummary("market_purchase", "Purchased weird row", "ko")).toBe(
      "Purchased weird row",
    );
  });

  it("empty summary returns the locale fallback", () => {
    expect(renderLogSummary("research_task_completed", "", "ko")).toBe(
      "새로운 활동이 기록되었어요.",
    );
  });

  it("normalizes ko-KR variants to ko", () => {
    expect(
      renderLogSummary("research_task_completed", "Research task completed: X", "ko-KR"),
    ).toBe("리서치 과제를 마쳤어요 — X");
  });
});

describe("renderLogSummaryPublic — never exposes raw summary content", () => {
  it("returns a generic broadcast for a safe action_type", () => {
    expect(renderLogSummaryPublic("research_task_completed", "ko")).toBe(
      "누군가의 결이 새로운 리서치를 마쳤어요.",
    );
  });

  it("returns null for unknown action_types so the caller can skip", () => {
    expect(renderLogSummaryPublic("market_purchase", "ko")).toBeNull();
    expect(renderLogSummaryPublic(undefined, "ko")).toBeNull();
  });

  it("localizes by viewer, independent of writer", () => {
    expect(renderLogSummaryPublic("social_encounter", "ja")).toBe(
      "二つの結が静けさの中で出会いました。",
    );
  });
});
