import { describe, it, expect } from "vitest";
import { mainTutorialSteps } from "./tutorial-steps";

describe("tutorial-steps", () => {
  it("defines at least one tutorial step", () => {
    expect(mainTutorialSteps.length).toBeGreaterThanOrEqual(1);
  });

  it("every step has required fields", () => {
    for (const step of mainTutorialSteps) {
      expect(step.target).toBeDefined();
      expect(typeof step.target).toBe("string");
      expect(step.target.length).toBeGreaterThan(0);

      expect(step.title).toBeDefined();
      expect(typeof step.title).toBe("string");

      expect(step.description).toBeDefined();
      expect(typeof step.description).toBe("string");
    }
  });

  it("all targets use data-tutorial attribute selectors", () => {
    for (const step of mainTutorialSteps) {
      expect(step.target).toMatch(/^\[data-tutorial=/);
    }
  });

  it("placement values are valid when provided", () => {
    const validPlacements = new Set(["top", "bottom", "left", "right"]);
    for (const step of mainTutorialSteps) {
      if (step.placement) {
        expect(validPlacements.has(step.placement)).toBe(true);
      }
    }
  });

  it("has no duplicate targets", () => {
    const targets = mainTutorialSteps.map((s) => s.target);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("first step targets the creature", () => {
    expect(mainTutorialSteps[0].target).toContain("creature");
  });
});

describe("tutorial-overlay exports", () => {
  it("exports TutorialOverlay component and useShouldShowTutorial hook", async () => {
    const mod = await import("./tutorial-overlay");
    expect(typeof mod.TutorialOverlay).toBe("function");
    expect(typeof mod.useShouldShowTutorial).toBe("function");
  });
});
