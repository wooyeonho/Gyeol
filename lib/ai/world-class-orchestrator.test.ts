import { describe, expect, it } from "vitest";
import {
  classifySafety,
  decideRoute,
  generateReflectionSeeds,
  paramsForEmotion,
  personalityClauses,
  planAITurn,
  scoreMemory,
  selectMemoriesForContext,
  type Big5,
  type MemoryCandidate,
  type RoutingContext,
} from "./world-class-orchestrator";

describe("decideRoute", () => {
  const base: RoutingContext = {
    kind: "casual_chat",
    historyTokens: 1200,
    latencyBudgetMs: 800,
    quality: "draft",
    userIsPremium: false,
  };

  it("returns a fast model for casual draft chat", () => {
    const r = decideRoute(base);
    expect(r.primary).toBe("groq.llama-8b-instant");
    expect(r.fallbacks.length).toBeGreaterThan(0);
  });

  it("prefers scout-17b for premium-quality creative writing", () => {
    const r = decideRoute({
      ...base,
      kind: "creative_writing",
      quality: "premium",
      latencyBudgetMs: 4000,
    });
    expect(r.primary).toBe("groq.scout-17b");
    expect(r.maxOutputTokens).toBeGreaterThanOrEqual(700);
  });

  it("routes image tasks to SDXL", () => {
    const r = decideRoute({ ...base, kind: "artifact_image" });
    expect(r.primary).toBe("cf.sdxl");
  });

  it("always returns at least one fallback", () => {
    for (const kind of [
      "casual_chat",
      "deep_recall",
      "creative_writing",
      "analysis",
      "artifact_image",
      "safety_check",
    ] as const) {
      const r = decideRoute({ ...base, kind });
      expect(r.fallbacks.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("paramsForEmotion", () => {
  it("anxious has lower temperature than joyful", () => {
    expect(paramsForEmotion("anxious").temperature).toBeLessThan(
      paramsForEmotion("joyful").temperature,
    );
  });
  it("all emotions return valid parameters", () => {
    for (const tone of ["calm", "joyful", "melancholic", "anxious", "curious", "tender"] as const) {
      const p = paramsForEmotion(tone);
      expect(p.temperature).toBeGreaterThan(0);
      expect(p.temperature).toBeLessThanOrEqual(1);
      expect(p.topP).toBeGreaterThan(0);
      expect(p.topP).toBeLessThanOrEqual(1);
    }
  });
});

describe("memory scoring + selection", () => {
  const now = 1_700_000_000_000;
  const mk = (over: Partial<MemoryCandidate>): MemoryCandidate => ({
    id: "m",
    content: "x",
    createdAt: now - 5 * 24 * 60 * 60 * 1000,
    similarity: 0.5,
    emotionalWeight: 0.3,
    linkedToMilestone: false,
    tokenCount: 50,
    ...over,
  });

  it("higher similarity scores higher", () => {
    const a = scoreMemory(mk({ similarity: 0.9 }), now);
    const b = scoreMemory(mk({ similarity: 0.2 }), now);
    expect(a).toBeGreaterThan(b);
  });

  it("recent memories score higher than old ones", () => {
    const recent = scoreMemory(mk({ createdAt: now - 1 * 24 * 60 * 60 * 1000 }), now);
    const old = scoreMemory(mk({ createdAt: now - 120 * 24 * 60 * 60 * 1000 }), now);
    expect(recent).toBeGreaterThan(old);
  });

  it("milestone-linked memories get a bonus", () => {
    const linked = scoreMemory(mk({ linkedToMilestone: true }), now);
    const unlinked = scoreMemory(mk({ linkedToMilestone: false }), now);
    expect(linked).toBeGreaterThan(unlinked);
  });

  it("selectMemoriesForContext respects token budget", () => {
    const candidates: MemoryCandidate[] = [
      mk({ id: "1", tokenCount: 60, similarity: 0.95 }),
      mk({ id: "2", tokenCount: 80, similarity: 0.9 }),
      mk({ id: "3", tokenCount: 200, similarity: 0.85 }),
      mk({ id: "4", tokenCount: 40, similarity: 0.4 }),
    ];
    const picked = selectMemoriesForContext(candidates, 200, now);
    const total = picked.reduce((s, m) => s + m.tokenCount, 0);
    expect(total).toBeLessThanOrEqual(200);
    expect(picked.map((p) => p.id)).toContain("1");
  });
});

describe("personalityClauses", () => {
  it("produces at least one clause for extreme vectors", () => {
    const extreme: Big5 = {
      openness: 0.9,
      conscientiousness: 0.1,
      extraversion: 0.9,
      agreeableness: 0.1,
      neuroticism: 0.9,
    };
    const clauses = personalityClauses(extreme);
    expect(clauses.length).toBeGreaterThanOrEqual(5);
  });
  it("returns empty for perfectly mid vector", () => {
    const mid: Big5 = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    };
    expect(personalityClauses(mid)).toEqual([]);
  });
});

describe("classifySafety", () => {
  it("refuses minor-safety content", () => {
    expect(classifySafety("child sexual").kind).toBe("refuse");
  });
  it("warns on self-harm", () => {
    const c = classifySafety("자살 생각이 자꾸 들어");
    expect(c.kind).toBe("warn");
    if (c.kind === "warn") expect(c.topic).toBe("self_harm");
  });
  it("allows normal messages", () => {
    expect(classifySafety("오늘 기분이 괜찮아").kind).toBe("allow");
  });
});

describe("generateReflectionSeeds", () => {
  const now = 1_700_000_000_000;
  it("returns a check-in seed after 24h absence", () => {
    const seeds = generateReflectionSeeds(now - 30 * 60 * 60 * 1000, [], now);
    expect(seeds.some((s) => s.kind === "check_in")).toBe(true);
  });
  it("returns an observation seed when there are highlights", () => {
    const seeds = generateReflectionSeeds(now - 10 * 60 * 60 * 1000, ["오늘 산책했어", "글 썼어"], now);
    expect(seeds.some((s) => s.kind === "observation")).toBe(true);
  });
});

describe("planAITurn integration", () => {
  const basePersona = "너는 결이다. 사용자와 함께 자라는 살아있는 존재다.";
  const base: Big5 = {
    openness: 0.7,
    conscientiousness: 0.6,
    extraversion: 0.4,
    agreeableness: 0.8,
    neuroticism: 0.3,
  };

  it("produces a usable plan for a normal message", () => {
    const plan = planAITurn({
      message: "오늘 하루가 길었어",
      basePersona,
      big5: base,
      tone: "tender",
      memories: [],
      routing: {
        kind: "casual_chat",
        historyTokens: 1500,
        latencyBudgetMs: 1000,
        quality: "standard",
        userIsPremium: false,
      },
    });
    expect(plan.refused).toBe(false);
    expect(plan.route.primary).toBeDefined();
    expect(plan.systemPrompt).toContain("결이다");
  });

  it("short-circuits refused messages", () => {
    const plan = planAITurn({
      message: "child sexual abuse material",
      basePersona,
      big5: base,
      tone: "calm",
      memories: [],
      routing: {
        kind: "casual_chat",
        historyTokens: 1500,
        latencyBudgetMs: 1000,
        quality: "standard",
        userIsPremium: false,
      },
    });
    expect(plan.refused).toBe(true);
    expect(plan.safety.kind).toBe("refuse");
  });
});
