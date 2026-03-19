import { describe, it, expect } from "vitest";
import {
  FEATURE_FLAG,
  FEATURE_FLAGS,
  EXPERIMENT,
  EXPERIMENT_VARIANTS,
} from "./catalog";

describe("FEATURE_FLAG", () => {
  it("has known flags", () => {
    expect(FEATURE_FLAG.plansSurface).toBe("plans_surface");
    expect(FEATURE_FLAG.productOpsAnalytics).toBe("product_ops_analytics");
  });
});

describe("FEATURE_FLAGS", () => {
  it("has boolean values for all flags", () => {
    for (const key of Object.keys(FEATURE_FLAGS)) {
      expect(typeof FEATURE_FLAGS[key as keyof typeof FEATURE_FLAGS]).toBe("boolean");
    }
  });

  it("plans_surface is enabled", () => {
    expect(FEATURE_FLAGS.plans_surface).toBe(true);
  });
});

describe("EXPERIMENT", () => {
  it("has firstMessageOnboarding", () => {
    expect(EXPERIMENT.firstMessageOnboarding).toBe("first_message_onboarding");
  });
});

describe("EXPERIMENT_VARIANTS", () => {
  it("first_message_onboarding has 7 variants", () => {
    expect(EXPERIMENT_VARIANTS.first_message_onboarding).toHaveLength(7);
    expect(EXPERIMENT_VARIANTS.first_message_onboarding).toContain("playful");
    expect(EXPERIMENT_VARIANTS.first_message_onboarding).toContain("intimate");
    expect(EXPERIMENT_VARIANTS.first_message_onboarding).toContain("reflective");
  });
});
