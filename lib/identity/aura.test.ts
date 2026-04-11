import { describe, it, expect } from "vitest";
import {
  auraFor,
  interpolateAura,
  layerAura,
  auraToCssGradient,
  auraPulseDurationSec,
} from "./aura";

describe("emotional aura", () => {
  it("returns defined auras for every canonical mood", () => {
    const moods = [
      "joyful","calm","curious","tender","grateful","playful","wistful",
      "contemplative","melancholy","anxious","lonely","hurt","angry","afraid",
      "awestruck","determined","shy","affectionate","mischievous","dreaming",
      "bored","hopeful","confused","embarrassed","loving",
    ] as const;
    for (const m of moods) {
      const a = auraFor(m);
      expect(a.hue).toBeGreaterThanOrEqual(0);
      expect(a.hue).toBeLessThanOrEqual(360);
      expect(a.intensity).toBeGreaterThanOrEqual(0);
      expect(a.intensity).toBeLessThanOrEqual(1);
    }
  });

  it("interpolates endpoints correctly", () => {
    const a = auraFor("joyful");
    const b = auraFor("melancholy");
    expect(interpolateAura(a, b, 0)).toMatchObject({ intensity: a.intensity });
    expect(interpolateAura(a, b, 1).intensity).toBeCloseTo(b.intensity, 5);
  });

  it("takes the short hue arc when interpolating", () => {
    // 350 -> 10 should wrap through 0, not through 180.
    const a = { hue: 350, intensity: 1, pulseHz: 1, particleRate: 0, warmth: 0 };
    const b = { hue: 10, intensity: 1, pulseHz: 1, particleRate: 0, warmth: 0 };
    const mid = interpolateAura(a, b, 0.5);
    // Mid should be close to 0 (or 360), not 180.
    const distanceFromZero = Math.min(mid.hue, 360 - mid.hue);
    expect(distanceFromZero).toBeLessThan(5);
  });

  it("layerAura returns pure surface when hidden equals surface", () => {
    expect(layerAura("calm", "calm")).toEqual(auraFor("calm"));
  });

  it("layerAura pulls toward hidden mood slightly", () => {
    const surface = auraFor("joyful");
    const layered = layerAura("joyful", "melancholy");
    expect(layered.intensity).toBeLessThan(surface.intensity);
  });

  it("builds a CSS radial gradient string", () => {
    const css = auraToCssGradient(auraFor("loving"));
    expect(css).toContain("radial-gradient");
    expect(css).toContain("hsl(");
  });

  it("computes pulse duration as inverse of frequency", () => {
    const a = { hue: 0, intensity: 1, pulseHz: 2, particleRate: 0, warmth: 0 };
    expect(auraPulseDurationSec(a)).toBeCloseTo(0.5);
  });
});
