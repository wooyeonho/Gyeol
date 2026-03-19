import { describe, it, expect } from "vitest";
import { generateInitialDNA } from "./dna";
import { deriveSpecies } from "./species";
import { deriveVoiceParams, modulateVoice } from "./voice-synth";

describe("Voice Synthesis System", () => {
  it("derives voice params from DNA", () => {
    const dna = generateInitialDNA("voice-test-1");
    const species = deriveSpecies(dna);
    const voice = deriveVoiceParams(dna, species);

    expect(voice.baseFreq).toBeGreaterThanOrEqual(80);
    expect(voice.baseFreq).toBeLessThanOrEqual(400);
    expect(voice.formants).toHaveLength(3);
    expect(voice.breathiness).toBeGreaterThanOrEqual(0);
    expect(voice.breathiness).toBeLessThanOrEqual(0.6);
    expect(voice.syllablePattern.length).toBeGreaterThanOrEqual(4);
    expect(voice.syllablePattern.length).toBeLessThanOrEqual(8);
  });

  it("produces different voices for different DNA", () => {
    const dna1 = generateInitialDNA("voice-a");
    const dna2 = generateInitialDNA("voice-b");
    const s1 = deriveSpecies(dna1);
    const s2 = deriveSpecies(dna2);
    const v1 = deriveVoiceParams(dna1, s1);
    const v2 = deriveVoiceParams(dna2, s2);

    // Base frequencies should differ
    expect(v1.baseFreq).not.toBeCloseTo(v2.baseFreq, 0);
  });

  it("is deterministic for the same DNA", () => {
    const dna = generateInitialDNA("voice-det");
    const species = deriveSpecies(dna);
    const v1 = deriveVoiceParams(dna, species);
    const v2 = deriveVoiceParams(dna, species);
    expect(v1).toEqual(v2);
  });

  it("warm creatures have lower base frequency", () => {
    const warm = generateInitialDNA("voice-warm");
    warm.warmth = 0.95;
    warm.empathy = 0.8;
    warm.analytical = 0.2;

    const cold = generateInitialDNA("voice-cold");
    cold.warmth = 0.2;
    cold.analytical = 0.9;
    cold.spatial = 0.8;

    const vWarm = deriveVoiceParams(warm, deriveSpecies(warm));
    const vCold = deriveVoiceParams(cold, deriveSpecies(cold));

    expect(vWarm.baseFreq).toBeLessThan(vCold.baseFreq);
  });

  it("emotional modulation adjusts parameters", () => {
    const dna = generateInitialDNA("voice-emo");
    const species = deriveSpecies(dna);
    const base = deriveVoiceParams(dna, species);

    const joyful = modulateVoice(base, { joy: 1, energy: 0.9 });
    expect(joyful.baseFreq).toBeGreaterThan(base.baseFreq);

    const scared = modulateVoice(base, { fear: 1, energy: 0.3 });
    expect(scared.breathiness).toBeGreaterThan(base.breathiness);
    expect(scared.vibratoRate).toBeGreaterThan(base.vibratoRate);
  });

  it("timbre reflects DNA traits", () => {
    const creative = generateInitialDNA("voice-creative-timbre");
    creative.creativity = 0.85;
    creative.analytical = 0.3;
    const vCreative = deriveVoiceParams(creative, deriveSpecies(creative));
    expect(vCreative.timbre).toBe("fmsine");

    const analytical = generateInitialDNA("voice-analytical-timbre");
    analytical.analytical = 0.85;
    analytical.creativity = 0.3;
    const vAnalytical = deriveVoiceParams(analytical, deriveSpecies(analytical));
    expect(vAnalytical.timbre).toBe("amsine");
  });
});
