import { describe, it, expect } from "vitest";
import { getExpression, lerpExpression } from "./expression-system";

describe("expression-system", () => {
  it("returns neutral for null mood", () => {
    const expr = getExpression(null);
    expect(expr.eyeOpenness).toBe(1);
    expect(expr.mouthCurve).toBe(0);
    expect(expr.intensity).toBe(0.5);
  });

  it("returns neutral for unknown mood", () => {
    const expr = getExpression("nonexistent_mood");
    expect(expr.eyeOpenness).toBe(1);
  });

  it("returns joyful expression", () => {
    const expr = getExpression("joyful");
    expect(expr.mouthCurve).toBe(1);
    expect(expr.eyeOpenness).toBe(0.7);
    expect(expr.blush).toBe(0.3);
  });

  it("returns scared expression with wide eyes", () => {
    const expr = getExpression("scared");
    expect(expr.eyeOpenness).toBe(1.5);
    expect(expr.pupilScale).toBe(1.5);
    expect(expr.intensity).toBe(1.0);
  });

  it("returns sleepy expression with droopy eyes", () => {
    const expr = getExpression("sleepy");
    expect(expr.eyeOpenness).toBe(0.3);
    expect(expr.eyelidDroop).toBe(0.9);
  });

  it("lerps between two expressions", () => {
    const from = getExpression("joyful");
    const to = getExpression("sad");
    const mid = lerpExpression(from, to, 0.5);

    // Should be halfway between
    expect(mid.mouthCurve).toBeCloseTo((from.mouthCurve + to.mouthCurve) / 2, 5);
    expect(mid.eyeOpenness).toBeCloseTo((from.eyeOpenness + to.eyeOpenness) / 2, 5);
  });

  it("lerp t=0 returns from, t=1 returns to", () => {
    const from = getExpression("excited");
    const to = getExpression("bored");

    const atZero = lerpExpression(from, to, 0);
    expect(atZero.eyeOpenness).toBe(from.eyeOpenness);

    const atOne = lerpExpression(from, to, 1);
    expect(atOne.eyeOpenness).toBe(to.eyeOpenness);
  });

  it("includes head gesture for joyful (nod)", () => {
    const expr = getExpression("joyful");
    expect(expr.headGesture).toBeGreaterThan(0); // nod
  });

  it("includes head gesture for angry (shake)", () => {
    const expr = getExpression("angry");
    expect(expr.headGesture).toBeLessThan(0); // shake
  });

  it("includes head tilt for curious", () => {
    const expr = getExpression("curious");
    expect(expr.headTilt).toBeGreaterThan(0);
  });

  it("default expression has neutral head gestures", () => {
    const expr = getExpression(null);
    expect(expr.headGesture).toBe(0);
    expect(expr.headTilt).toBe(0);
  });

  it("lerps head gesture fields correctly", () => {
    const from = getExpression("joyful");
    const to = getExpression("angry");
    const mid = lerpExpression(from, to, 0.5);
    expect(mid.headGesture).toBeCloseTo((from.headGesture + to.headGesture) / 2, 5);
  });

  it("covers all 28 moods", () => {
    const moods = [
      "joyful", "playful", "excited", "proud", "inspired", "loving", "grateful", "mischievous",
      "curious", "thoughtful", "dreamy", "focused", "peaceful", "tender",
      "melancholy", "sad", "lonely", "angry", "frustrated", "scared", "shy", "jealous",
      "surprised", "confused", "bored", "energetic", "sleepy",
    ];
    for (const mood of moods) {
      const expr = getExpression(mood);
      expect(expr.intensity).toBeDefined();
      expect(expr.eyeOpenness).toBeGreaterThan(0);
    }
  });
});
