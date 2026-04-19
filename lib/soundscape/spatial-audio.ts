/**
 * Spatial Audio — Web Audio API PannerNode wrapper.
 *
 * Provides a singleton AudioContext with HRTF-based 3D positioning.
 * Creature sounds are placed in space using the creature's R3F position,
 * giving directional and distance cues to the listener.
 *
 * Browser policy: AudioContext must be initialized after a user gesture.
 * Call initSpatialAudio() on first touch/click; subsequent calls are no-ops.
 */

import { getCreatureVoice } from "@/lib/soundscape/creature-voice";

let _ctx: AudioContext | null = null;

/**
 * Initialize (or resume) the singleton AudioContext.
 * Safe to call multiple times — returns existing context after first call.
 */
export function initSpatialAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!window.AudioContext) return null;
  if (!_ctx) {
    _ctx = new AudioContext();
  }
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {/* ignore */});
  }
  return _ctx;
}

/**
 * Map a normalized R3F creature position (-1..1) to PannerNode 3D coordinates.
 * The listener is assumed to be at the camera position looking toward the creature.
 * x: left-right pan (-3..3m), y: up-down (-1..1m), z: fixed at -2m (in front)
 */
function toPannerPosition(pos: { x: number; y: number }): { x: number; y: number; z: number } {
  return { x: pos.x * 3, y: pos.y * 1, z: -2 };
}

/**
 * Play a spatially positioned creature vocalization.
 *
 * @param position  - Creature's normalized R3F position {x, y} in -1..1 range
 * @param emotion   - Emotion string (resolved via creature-voice.ts)
 * @param dna       - Optional DNA axes for pitch/volume modulation
 */
export function playSpatialCreatureSound(
  position: { x: number; y: number },
  emotion: string,
  dna?: Record<string, number>,
): void {
  const ctx = _ctx;
  if (!ctx || ctx.state !== "running") return;

  try {
    const profile = getCreatureVoice(emotion, dna ?? {});
    const pannerPos = toPannerPosition(position);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createPanner();

    // Spatial positioning
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.maxDistance = 10;
    panner.rolloffFactor = 1;
    panner.positionX.value = pannerPos.x;
    panner.positionY.value = pannerPos.y;
    panner.positionZ.value = pannerPos.z;

    // Oscillator configuration
    osc.type = profile.waveform;
    osc.frequency.setValueAtTime(profile.pitch, ctx.currentTime);

    const durationSec = profile.duration / 1000;
    const attackSec = Math.min(durationSec * 0.15, 0.03);
    const releaseSec = Math.min(durationSec * 0.25, 0.08);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(profile.volume, ctx.currentTime + attackSec);
    gain.gain.setValueAtTime(profile.volume, ctx.currentTime + durationSec - releaseSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

    if (profile.pitchEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(profile.pitchEnd, ctx.currentTime + durationSec);
    }

    // LFO modulation for trembling / oscillating / rough patterns
    if (profile.modulationRate > 0 && profile.modulationDepth > 0) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = profile.modulationPattern === "rough" ? "square" : "sine";
      lfo.frequency.value = profile.modulationRate;
      lfoGain.gain.value = profile.modulationDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(ctx.currentTime);
      lfo.stop(ctx.currentTime + durationSec);
    }

    // Signal chain: oscillator → gain → panner → destination
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSec + 0.01);
  } catch {
    // Fail silently — audio is non-critical
  }
}
