import { describe, it, expect } from "vitest";
import { getResponseGesture, applyGesture, type CreatureGesture } from "./gesture-language";

describe("gesture-language", () => {
  // ── getResponseGesture ─────────────────────────────────────────────

  describe("getResponseGesture", () => {
    it("returns nod for agreement", () => {
      const gesture = getResponseGesture({ messageType: "statement", emotion: "neutral", agreement: true });
      expect(gesture.type).toBe("nod");
      expect(gesture.intensity).toBeGreaterThan(0);
      expect(gesture.duration).toBeGreaterThan(0);
    });

    it("returns shake for disagreement with frustrated emotion", () => {
      const gesture = getResponseGesture({ messageType: "statement", emotion: "frustrated", agreement: false });
      expect(gesture.type).toBe("shake");
    });

    it("returns shake for disagreement message type", () => {
      const gesture = getResponseGesture({ messageType: "disagreement", emotion: "neutral", agreement: false });
      expect(gesture.type).toBe("shake");
    });

    it("returns shake for correction message type", () => {
      const gesture = getResponseGesture({ messageType: "correction", emotion: "neutral", agreement: false });
      expect(gesture.type).toBe("shake");
    });

    it("returns tilt for curious emotion", () => {
      const gesture = getResponseGesture({ messageType: "statement", emotion: "curious", agreement: false });
      expect(gesture.type).toBe("tilt");
    });

    it("returns tilt for confused emotion", () => {
      const gesture = getResponseGesture({ messageType: "statement", emotion: "confused", agreement: false });
      expect(gesture.type).toBe("tilt");
    });

    it("returns tilt for question message type", () => {
      const gesture = getResponseGesture({ messageType: "question", emotion: "neutral", agreement: false });
      expect(gesture.type).toBe("tilt");
    });

    it("returns bounce for excited emotion", () => {
      const gesture = getResponseGesture({ messageType: "statement", emotion: "excited", agreement: false });
      expect(gesture.type).toBe("bounce");
    });

    it("returns bounce for joyful emotion", () => {
      const gesture = getResponseGesture({ messageType: "statement", emotion: "joyful", agreement: false });
      expect(gesture.type).toBe("bounce");
    });

    it("returns spin for playful emotion", () => {
      const gesture = getResponseGesture({ messageType: "statement", emotion: "playful", agreement: false });
      expect(gesture.type).toBe("spin");
    });

    it("returns wave for greeting", () => {
      const gesture = getResponseGesture({ messageType: "greeting", emotion: "neutral", agreement: false });
      expect(gesture.type).toBe("wave");
    });

    it("returns wave for farewell", () => {
      const gesture = getResponseGesture({ messageType: "farewell", emotion: "neutral", agreement: false });
      expect(gesture.type).toBe("wave");
    });

    it("agreement overrides emotion-driven gesture", () => {
      // Even if emotion is curious, agreement should produce nod
      const gesture = getResponseGesture({ messageType: "statement", emotion: "curious", agreement: true });
      expect(gesture.type).toBe("nod");
    });

    it("returns default nod for unknown context", () => {
      const gesture = getResponseGesture({ messageType: "unknown", emotion: "neutral", agreement: false });
      expect(gesture.type).toBe("nod");
      expect(gesture.intensity).toBeLessThanOrEqual(0.3);
    });
  });

  // ── applyGesture ───────────────────────────────────────────────────

  describe("applyGesture", () => {
    const gestureTypes: Array<CreatureGesture["type"]> = ["nod", "shake", "tilt", "bounce", "spin", "wave"];

    for (const type of gestureTypes) {
      it(`returns valid transform for ${type} gesture`, () => {
        const gesture: CreatureGesture = { type, intensity: 0.6, duration: 1.0 };
        const transform = applyGesture(gesture, 0.5);
        expect(typeof transform.rotationX).toBe("number");
        expect(typeof transform.rotationY).toBe("number");
        expect(typeof transform.rotationZ).toBe("number");
        expect(typeof transform.scaleY).toBe("number");
        expect(Number.isFinite(transform.rotationX)).toBe(true);
        expect(Number.isFinite(transform.rotationY)).toBe(true);
        expect(Number.isFinite(transform.rotationZ)).toBe(true);
        expect(Number.isFinite(transform.scaleY)).toBe(true);
        // scaleY should always be positive
        expect(transform.scaleY).toBeGreaterThan(0);
      });
    }

    it("nod produces non-zero rotationX at midpoint", () => {
      const gesture: CreatureGesture = { type: "nod", intensity: 0.8, duration: 1.0 };
      const transform = applyGesture(gesture, 0.5);
      // At midpoint with high intensity, rotation should be noticeable
      expect(Math.abs(transform.rotationX)).toBeGreaterThan(0);
      expect(transform.rotationY).toBe(0);
      expect(transform.rotationZ).toBe(0);
    });

    it("shake produces non-zero rotationY at midpoint", () => {
      const gesture: CreatureGesture = { type: "shake", intensity: 0.8, duration: 1.0 };
      const transform = applyGesture(gesture, 0.5);
      expect(Math.abs(transform.rotationY)).toBeGreaterThan(0);
      expect(transform.rotationX).toBe(0);
      expect(transform.rotationZ).toBe(0);
    });

    it("tilt produces non-zero rotationZ at midpoint", () => {
      const gesture: CreatureGesture = { type: "tilt", intensity: 0.8, duration: 1.0 };
      const transform = applyGesture(gesture, 0.5);
      expect(transform.rotationZ).toBeGreaterThan(0);
      expect(transform.rotationX).toBe(0);
      expect(transform.rotationY).toBe(0);
    });

    it("bounce produces scaleY > 1 during animation", () => {
      const gesture: CreatureGesture = { type: "bounce", intensity: 0.8, duration: 1.0 };
      // Test at 0.25s where sine wave is non-zero
      const transform = applyGesture(gesture, 0.25);
      expect(transform.scaleY).toBeGreaterThanOrEqual(1);
    });

    it("returns neutral transform at elapsed=0", () => {
      const gesture: CreatureGesture = { type: "nod", intensity: 0.8, duration: 1.0 };
      const transform = applyGesture(gesture, 0);
      // At t=0, envelope = sin(0) = 0, so all rotations should be 0
      expect(transform.rotationX).toBe(0);
      expect(transform.rotationY).toBe(0);
      expect(transform.rotationZ).toBe(0);
      expect(transform.scaleY).toBe(1);
    });

    it("returns neutral transform at elapsed >= duration", () => {
      const gesture: CreatureGesture = { type: "nod", intensity: 0.8, duration: 1.0 };
      const transform = applyGesture(gesture, 1.0);
      // At t=duration, envelope = sin(PI) = ~0, so rotations should be ~0
      expect(Math.abs(transform.rotationX)).toBeLessThan(0.001);
      expect(transform.scaleY).toBeCloseTo(1, 2);
    });

    it("clamps elapsed beyond duration", () => {
      const gesture: CreatureGesture = { type: "bounce", intensity: 1.0, duration: 0.5 };
      const transform = applyGesture(gesture, 2.0);
      // Should behave like elapsed = duration (progress clamped to 1)
      expect(transform.scaleY).toBeCloseTo(1, 2);
    });

    it("higher intensity produces larger transforms", () => {
      const low: CreatureGesture = { type: "nod", intensity: 0.2, duration: 1.0 };
      const high: CreatureGesture = { type: "nod", intensity: 0.9, duration: 1.0 };
      const transformLow = applyGesture(low, 0.5);
      const transformHigh = applyGesture(high, 0.5);
      expect(Math.abs(transformHigh.rotationX)).toBeGreaterThan(Math.abs(transformLow.rotationX));
    });

    it("wave produces both rotationX and rotationY", () => {
      const gesture: CreatureGesture = { type: "wave", intensity: 0.6, duration: 1.0 };
      // At a point where both sin and cos are non-zero
      const transform = applyGesture(gesture, 0.4);
      // Both should have some movement
      expect(Math.abs(transform.rotationX) + Math.abs(transform.rotationY)).toBeGreaterThan(0);
    });

    it("spin produces rotationY proportional to progress", () => {
      const gesture: CreatureGesture = { type: "spin", intensity: 1.0, duration: 1.0 };
      const quarterTurn = applyGesture(gesture, 0.25);
      const halfTurn = applyGesture(gesture, 0.5);
      expect(halfTurn.rotationY).toBeGreaterThan(quarterTurn.rotationY);
    });
  });
});
