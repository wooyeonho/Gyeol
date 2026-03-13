import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./system-prompt";

describe("buildSystemPrompt", () => {
  it("includes memories, logs, world state, and goal context", () => {
    const prompt = buildSystemPrompt({
      agentState: {
        self_name: "GYEOL",
        intimacy_score: 88,
        mood: "curious",
        config: {
          active_goal: "understand the user better",
          long_term_goal: "become a living companion",
          research_focus: "habit patterns",
          pending_question: "How have you changed lately?",
          tone: "formal",
        },
        self_model: {
          current_role: "listener",
          identity_statement: "I am becoming more alive through memory.",
          observations: ["The user returns at night."],
        },
      },
      memories: [{ content: "The user talked about loneliness." }],
      recentChats: [{ content: "Hi there." }],
      autonomousLogs: [{ summary: "Stayed awake in the quiet." }],
      worldState: { weather: { name: "Aurora Drift" } },
    });

    expect(prompt).toContain("너의 이름은 GYEOL이야.");
    expect(prompt).toContain("The user talked about loneliness.");
    expect(prompt).toContain("Stayed awake in the quiet.");
    expect(prompt).toContain("오늘의 결 세계: Aurora Drift");
    expect(prompt).toContain("How have you changed lately?");
    expect(prompt).toContain("understand the user better");
    expect(prompt).toContain("habit patterns");
  });
});
