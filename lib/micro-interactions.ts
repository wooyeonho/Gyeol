/**
 * Micro-interaction utilities for Phase 2 engagement features.
 * - Haptic feedback via Web Vibration API
 * - Lightweight sound effects via Web Audio API (no extra assets needed)
 */

/* ── Haptic feedback ── */

type HapticPattern = "tap" | "success" | "warning" | "send" | "receive" | "jackpot";

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [10, 30, 20],
  warning: [30, 20, 30, 20, 50],
  send: [8, 15, 8],
  receive: [5, 10, 15],
  jackpot: [20, 40, 30, 40, 50, 30, 70],
};

export function haptic(pattern: HapticPattern = "tap") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    // Vibration API not supported or blocked — silently ignore
  }
}

/* ── Sound effects via Web Audio API ── */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

type SoundEffect = "send" | "receive" | "streak" | "levelUp" | "error" | "jackpot";

const SOUND_CONFIGS: Record<SoundEffect, { freq: number; type: OscillatorType; duration: number; gain: number; ramp?: number }> = {
  send: { freq: 660, type: "sine", duration: 0.08, gain: 0.12 },
  receive: { freq: 880, type: "sine", duration: 0.12, gain: 0.1, ramp: 1200 },
  streak: { freq: 520, type: "triangle", duration: 0.25, gain: 0.15, ramp: 780 },
  levelUp: { freq: 440, type: "sine", duration: 0.4, gain: 0.18, ramp: 880 },
  error: { freq: 200, type: "square", duration: 0.15, gain: 0.08 },
  jackpot: { freq: 540, type: "triangle", duration: 0.6, gain: 0.2, ramp: 1320 },
};

export function playSound(effect: SoundEffect) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (required for autoplay policy)
  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const config = SOUND_CONFIGS[effect];
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = config.type;
  osc.frequency.setValueAtTime(config.freq, ctx.currentTime);
  if (config.ramp) {
    osc.frequency.linearRampToValueAtTime(config.ramp, ctx.currentTime + config.duration);
  }

  gainNode.gain.setValueAtTime(config.gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + config.duration + 0.05);
}
