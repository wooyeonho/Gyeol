import { describe, expect, it } from "vitest";
import { getCreatureVoice } from "./creature-voice";
import type { CreatureVoiceProfile } from "./creature-voice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default neutral DNA — all axes at 0.5. */
const neutralDna: Record<string, number> = {
  playfulness: 0.5,
  intensity: 0.5,
  warmth: 0.5,
  stability: 0.5,
  openness: 0.5,
};

function makeDna(overrides: Record<string, number> = {}): Record<string, number> {
  return { ...neutralDna, ...overrides };
}

// ---------------------------------------------------------------------------
// Emotion → distinct pitch ranges
// ---------------------------------------------------------------------------

describe("getCreatureVoice — emotion pitch ranges", () => {
  const emotions = [
    { name: "happy", minPitch: 400, maxPitch: 800 },
    { name: "joyful", minPitch: 400, maxPitch: 850 },
    { name: "sad", minPitch: 200, maxPitch: 300 },
    { name: "lonely", minPitch: 200, maxPitch: 300 },
    { name: "surprised", minPitch: 600, maxPitch: 1000 },
    { name: "content", minPitch: 150, maxPitch: 250 },
    { name: "peaceful", minPitch: 150, maxPitch: 250 },
    { name: "scared", minPitch: 300, maxPitch: 500 },
    { name: "angry", minPitch: 100, maxPitch: 200 },
  ];

  for (const { name, minPitch, maxPitch } of emotions) {
    it(`${name}: pitch falls within ${minPitch}–${maxPitch} Hz`, () => {
      const voice = getCreatureVoice(name, makeDna());
      expect(voice.pitch).toBeGreaterThanOrEqual(minPitch);
      expect(voice.pitch).toBeLessThanOrEqual(maxPitch);
    });
  }

  it("happy and sad have non-overlapping pitch ranges at neutral DNA", () => {
    const happy = getCreatureVoice("happy", makeDna());
    const sad = getCreatureVoice("sad", makeDna());
    expect(happy.pitch).toBeGreaterThan(sad.pitch);
  });

  it("surprised has higher pitch than scared", () => {
    const surprised = getCreatureVoice("surprised", makeDna());
    const scared = getCreatureVoice("scared", makeDna());
    expect(surprised.pitch).toBeGreaterThan(scared.pitch);
  });

  it("angry has the lowest pitch of the set", () => {
    const dna = makeDna();
    const angry = getCreatureVoice("angry", dna);
    const otherEmotions = ["happy", "sad", "surprised", "content", "scared"];
    for (const e of otherEmotions) {
      const other = getCreatureVoice(e, dna);
      expect(angry.pitch).toBeLessThan(other.pitch);
    }
  });
});

// ---------------------------------------------------------------------------
// Distinct modulation patterns per emotion
// ---------------------------------------------------------------------------

describe("getCreatureVoice — modulation patterns", () => {
  const dna = makeDna();

  it("happy uses a rising modulation", () => {
    expect(getCreatureVoice("happy", dna).modulationPattern).toBe("rising");
  });

  it("sad uses a falling modulation", () => {
    expect(getCreatureVoice("sad", dna).modulationPattern).toBe("falling");
  });

  it("content uses oscillating modulation (purring)", () => {
    expect(getCreatureVoice("content", dna).modulationPattern).toBe("oscillating");
  });

  it("scared uses trembling modulation", () => {
    expect(getCreatureVoice("scared", dna).modulationPattern).toBe("trembling");
  });

  it("angry uses rough modulation (growl)", () => {
    expect(getCreatureVoice("angry", dna).modulationPattern).toBe("rough");
  });
});

// ---------------------------------------------------------------------------
// Duration expectations
// ---------------------------------------------------------------------------

describe("getCreatureVoice — duration ranges", () => {
  const dna = makeDna();

  it("surprised is very short (< 200ms)", () => {
    expect(getCreatureVoice("surprised", dna).duration).toBeLessThanOrEqual(200);
  });

  it("sad is sustained (> 400ms)", () => {
    expect(getCreatureVoice("sad", dna).duration).toBeGreaterThanOrEqual(400);
  });

  it("content is sustained (> 300ms)", () => {
    expect(getCreatureVoice("content", dna).duration).toBeGreaterThanOrEqual(300);
  });
});

// ---------------------------------------------------------------------------
// DNA influence
// ---------------------------------------------------------------------------

describe("getCreatureVoice — DNA influence", () => {
  it("higher playfulness increases pitch", () => {
    const low = getCreatureVoice("happy", makeDna({ playfulness: 0.1 }));
    const high = getCreatureVoice("happy", makeDna({ playfulness: 0.9 }));
    expect(high.pitch).toBeGreaterThan(low.pitch);
  });

  it("higher intensity increases volume", () => {
    const low = getCreatureVoice("happy", makeDna({ intensity: 0.1 }));
    const high = getCreatureVoice("happy", makeDna({ intensity: 0.9 }));
    expect(high.volume).toBeGreaterThan(low.volume);
  });

  it("playfulness shifts pitch across different emotions", () => {
    for (const emotion of ["sad", "scared", "angry", "content"]) {
      const lowPlay = getCreatureVoice(emotion, makeDna({ playfulness: 0.0 }));
      const highPlay = getCreatureVoice(emotion, makeDna({ playfulness: 1.0 }));
      expect(highPlay.pitch).toBeGreaterThan(lowPlay.pitch);
    }
  });

  it("intensity shifts volume across different emotions", () => {
    for (const emotion of ["happy", "sad", "surprised", "angry"]) {
      const lowInt = getCreatureVoice(emotion, makeDna({ intensity: 0.0 }));
      const highInt = getCreatureVoice(emotion, makeDna({ intensity: 1.0 }));
      expect(highInt.volume).toBeGreaterThan(lowInt.volume);
    }
  });

  it("missing DNA axes default to 0.5", () => {
    const withDefaults = getCreatureVoice("happy", {});
    const explicit = getCreatureVoice("happy", makeDna({ playfulness: 0.5, intensity: 0.5 }));
    expect(withDefaults.pitch).toBe(explicit.pitch);
    expect(withDefaults.volume).toBe(explicit.volume);
  });
});

// ---------------------------------------------------------------------------
// Alias / fallback handling
// ---------------------------------------------------------------------------

describe("getCreatureVoice — aliases and fallbacks", () => {
  const dna = makeDna();

  it("'joy' maps to the happy voice archetype", () => {
    const joy = getCreatureVoice("joy", dna);
    const happy = getCreatureVoice("happy", dna);
    expect(joy.pitch).toBe(happy.pitch);
    expect(joy.modulationPattern).toBe(happy.modulationPattern);
  });

  it("'calm' maps to the content voice archetype", () => {
    const calm = getCreatureVoice("calm", dna);
    const content = getCreatureVoice("content", dna);
    expect(calm.pitch).toBe(content.pitch);
  });

  it("unknown emotion falls back to content", () => {
    const unknown = getCreatureVoice("something_unknown", dna);
    const content = getCreatureVoice("content", dna);
    expect(unknown.pitch).toBe(content.pitch);
    expect(unknown.modulationPattern).toBe(content.modulationPattern);
  });
});

// ---------------------------------------------------------------------------
// Profile structure validation
// ---------------------------------------------------------------------------

describe("getCreatureVoice — profile structure", () => {
  const allEmotions = [
    "happy", "joyful", "sad", "lonely", "surprised", "content",
    "peaceful", "scared", "angry", "excited", "curious", "playful", "sleepy",
  ];
  const dna = makeDna();

  for (const emotion of allEmotions) {
    it(`${emotion}: returns a valid CreatureVoiceProfile`, () => {
      const voice: CreatureVoiceProfile = getCreatureVoice(emotion, dna);
      expect(voice.pitch).toBeGreaterThan(0);
      expect(voice.duration).toBeGreaterThan(0);
      expect(voice.volume).toBeGreaterThan(0);
      expect(voice.volume).toBeLessThanOrEqual(1);
      expect(typeof voice.waveform).toBe("string");
      expect(typeof voice.modulationPattern).toBe("string");
      expect(voice.modulationRate).toBeGreaterThanOrEqual(0);
      expect(voice.modulationDepth).toBeGreaterThanOrEqual(0);
    });
  }
});
