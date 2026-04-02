import { describe, expect, it } from "vitest";
import {
  resolveIdleBehavior,
  getIdleBehaviorParams,
  type IdleBehavior,
} from "./idle-behaviors";

describe("resolveIdleBehavior", () => {
  const base = {
    idleSeconds: 0,
    mood: null as string | null,
    dna: null,
    affinityMood: null as string | null,
    recentTouchCount: 0,
    isStreaming: false,
  };

  it("returns alert when streaming", () => {
    expect(resolveIdleBehavior({ ...base, isStreaming: true, idleSeconds: 300 })).toBe("alert");
  });

  it("returns playing when recently touched a lot", () => {
    expect(resolveIdleBehavior({ ...base, recentTouchCount: 6, idleSeconds: 5 })).toBe("playing");
  });

  it("returns restless when lonely and idle > 90s", () => {
    expect(resolveIdleBehavior({ ...base, affinityMood: "lonely", idleSeconds: 100 })).toBe("restless");
  });

  it("returns curious when delighted", () => {
    expect(resolveIdleBehavior({ ...base, affinityMood: "delighted", idleSeconds: 5 })).toBe("curious");
  });

  it("returns sleeping after 180s idle", () => {
    expect(resolveIdleBehavior({ ...base, idleSeconds: 200 })).toBe("sleeping");
  });

  it("returns drowsy between 60-180s idle", () => {
    expect(resolveIdleBehavior({ ...base, idleSeconds: 90 })).toBe("drowsy");
  });

  it("returns daydreaming between 10-60s idle with no DNA", () => {
    expect(resolveIdleBehavior({ ...base, idleSeconds: 30 })).toBe("daydreaming");
  });

  it("returns alert when recently active (<10s)", () => {
    expect(resolveIdleBehavior({ ...base, idleSeconds: 5 })).toBe("alert");
  });

  it("returns meditating for stable warm DNA idle > 10s", () => {
    const dna = {
      analytical: 0.5, intuitive: 0.5, verbal: 0.5, spatial: 0.5,
      warmth: 0.6, intensity: 0.5, stability: 0.8, openness: 0.5,
      assertiveness: 0.5, empathy: 0.5, playfulness: 0.3, independence: 0.3,
      curiosity: 0.3, persistence: 0.5, adaptability: 0.5, creativity: 0.3,
    };
    expect(resolveIdleBehavior({ ...base, idleSeconds: 15, dna })).toBe("meditating");
  });
});

describe("getIdleBehaviorParams", () => {
  const allBehaviors: IdleBehavior[] = [
    "alert", "curious", "daydreaming", "playing", "restless",
    "meditating", "nesting", "drowsy", "sleeping", "dreaming",
  ];

  it("returns params for all 10 behaviors", () => {
    for (const behavior of allBehaviors) {
      const params = getIdleBehaviorParams(behavior);
      expect(params).toBeDefined();
      expect(typeof params.scaleOscillation).toBe("number");
      expect(typeof params.rotationSpeed).toBe("number");
      expect(typeof params.bobAmplitude).toBe("number");
      expect(typeof params.eyeOpenness).toBe("number");
      expect(typeof params.showDreamParticles).toBe("boolean");
    }
  });

  it("sleeping has eyes closed", () => {
    expect(getIdleBehaviorParams("sleeping").eyeOpenness).toBe(0);
  });

  it("dreaming shows dream particles", () => {
    expect(getIdleBehaviorParams("dreaming").showDreamParticles).toBe(true);
  });

  it("playing has high bob amplitude", () => {
    expect(getIdleBehaviorParams("playing").bobAmplitude).toBeGreaterThan(
      getIdleBehaviorParams("sleeping").bobAmplitude
    );
  });
});
