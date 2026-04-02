import type { CreatureDNA } from "@/lib/genome/dna";

/**
 * Derive unique sound parameters from DNA for the creature's birth chime.
 * Uses Tone.js (already in dependencies) to play a short melodic phrase.
 */
export function deriveBirthSoundParams(dna: CreatureDNA) {
  // Map DNA axes to musical parameters
  const baseFreq = 220 + dna.warmth * 220; // A3 to A4
  const brightness = 0.3 + dna.creativity * 0.7; // filter envelope
  const decay = 0.5 + dna.stability * 1.5; // note sustain
  const reverbWet = 0.2 + dna.intuitive * 0.6; // spaciousness
  const detune = (dna.openness - 0.5) * 200; // slight detuning

  return { baseFreq, brightness, decay, reverbWet, detune };
}

/**
 * Play a birth chime using Web Audio API (no Tone.js import to keep lightweight).
 * Falls back silently if AudioContext is unavailable.
 */
export async function playBirthSound(dna: CreatureDNA): Promise<void> {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    const params = deriveBirthSoundParams(dna);
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = params.baseFreq;
    osc.detune.value = params.detune;
    gain.gain.setValueAtTime(0.3 * params.brightness, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + params.decay);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + params.decay);

    // Play a second harmonic note after a short delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.value = params.baseFreq * 1.5; // perfect fifth
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15 + params.decay * 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.15 + params.decay * 0.7);

    // Cleanup after sound finishes
    setTimeout(() => { void ctx.close(); }, (params.decay + 0.5) * 1000);
  } catch {
    // Silently fail — audio is non-critical
  }
}
