import { describe, expect, it } from "vitest";
import { resolveIdentityAppearance } from "./appearance";

describe("resolveIdentityAppearance", () => {
  it("derives a manifestation state from usage and vitality", () => {
    const playful = resolveIdentityAppearance(
      {
        selfName: "GYEOL",
        config: {
          usage_profile: {
            primary_mode: "playful",
            scores: { playful: 2, reflective: 0.3 },
          },
        },
        genLevel: 2,
        vitality: 0.9,
      },
      "en",
    );

    const strategic = resolveIdentityAppearance(
      {
        selfName: "GYEOL",
        config: {
          usage_profile: {
            primary_mode: "strategic",
            scores: { strategic: 2, reflective: 0.2 },
          },
        },
        genLevel: 2,
        vitality: 0.9,
      },
      "en",
    );

    expect(playful.usageLabel).toBe("playful relation");
    expect(strategic.usageLabel).toBe("strategic relation");
    expect(playful.manifestation.warmth).not.toBe(strategic.manifestation.warmth);
    expect(playful.title).not.toBe(strategic.title);
    expect(playful.presence.nodeCount).toBeGreaterThan(0);
  });
});
