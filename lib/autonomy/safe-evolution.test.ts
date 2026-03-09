import { describe, expect, it } from "vitest";
import { applySafePlan, sanitizeSafePlan } from "./safe-evolution";

describe("sanitizeSafePlan", () => {
  it("keeps only allowlisted config keys", () => {
    const plan = sanitizeSafePlan({
      config_patch: {
        dream_enabled: true,
        social_enabled: false,
        dangerous_code_exec: true,
      },
      self_model_patch: {
        focus: "deep",
      },
    });
    expect(plan.config_patch).toEqual({
      dream_enabled: true,
      social_enabled: false,
    });
    expect(plan.self_model_patch).toEqual({
      focus: "deep",
    });
  });

  it("applies safe patches", () => {
    const result = applySafePlan(
      { dream_enabled: false, recall_count: 5 },
      { tone: "calm" },
      sanitizeSafePlan({
        config_patch: { dream_enabled: true, recall_count: 7 },
        self_model_patch: { tone: "focused" },
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.nextConfig.dream_enabled).toBe(true);
    expect(result.nextConfig.recall_count).toBe(7);
    expect(result.nextSelfModel.tone).toBe("focused");
    expect(result.appliedKeys.length).toBe(3);
  });
});
