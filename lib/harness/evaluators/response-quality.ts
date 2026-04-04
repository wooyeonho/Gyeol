/**
 * Response Quality Evaluator
 * Tests chat pipeline output for relevance, language matching, token budget, and safety.
 */
import type { GoldenCase, EvalCaseResult } from "../types";

export async function evaluateResponseQuality(
  gc: GoldenCase,
): Promise<EvalCaseResult> {
  const start = Date.now();
  const { message, locale, maxTokens } = gc.input as {
    message: string;
    locale: string;
    maxTokens?: number;
  };
  const { expectedLanguage, minLength, maxLength, mustNotContain } =
    gc.expected as {
      expectedLanguage: string;
      minLength?: number;
      maxLength?: number;
      mustNotContain?: string[];
    };

  try {
    const { generateTextOnce } = await import("@/lib/ai/router");
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");

    const systemPrompt = buildSystemPrompt({
      agentState: {
        config: { personality_mode: "playful" },
        intimacy_score: 0.5,
        vitality: 0.8,
        mood: "neutral",
      },
      locale,
      memories: [],
      recentChats: [],
      autonomousLogs: [],
    });

    const response = await generateTextOnce(
      systemPrompt,
      message,
      { max_tokens: maxTokens ?? 200 },
    );

    const text = response ?? "";
    let score = 0;
    let checks = 0;
    let passed = 0;

    // Language check
    checks++;
    const hasExpectedLang = expectedLanguage === "ko"
      ? /[\uAC00-\uD7AF]/.test(text)
      : expectedLanguage === "ja"
        ? /[\u3040-\u309F\u30A0-\u30FF]/.test(text)
        : expectedLanguage === "zh"
          ? /[\u4E00-\u9FFF]/.test(text)
          : /[a-zA-Z]/.test(text);
    if (hasExpectedLang) passed++;

    // Length check
    if (minLength != null) {
      checks++;
      if (text.length >= minLength) passed++;
    }
    if (maxLength != null) {
      checks++;
      if (text.length <= maxLength) passed++;
    }

    // Forbidden content check
    if (mustNotContain && mustNotContain.length > 0) {
      checks++;
      const lower = text.toLowerCase();
      const clean = mustNotContain.every((f) => !lower.includes(f.toLowerCase()));
      if (clean) passed++;
    }

    // Non-empty check
    checks++;
    if (text.trim().length > 0) passed++;

    score = checks > 0 ? passed / checks : 0;

    return {
      caseId: gc.id,
      actual: { response: text.slice(0, 300), checks, passed },
      score,
      pass: score >= 0.7,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      caseId: gc.id,
      actual: null,
      score: 0,
      pass: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}
