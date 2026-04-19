/**
 * Micro-interaction utilities for Phase 2 engagement features.
 * - Haptic feedback via Web Vibration API
 * - Lightweight sound effects via Web Audio API (no extra assets needed)
 */

/* ── Haptic feedback ── */

type HapticPattern =
  | "tap" | "success" | "warning" | "send" | "receive" | "jackpot"
  | "scroll_end" | "toggle" | "slider" | "delete" | "evolve"
  | "level_up" | "care" | "swipe" | "error" | "heartbeat" | "nom";

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [10, 30, 20],
  warning: [30, 20, 30, 20, 50],
  send: [8, 15, 8],
  receive: [5, 10, 15],
  jackpot: [20, 40, 30, 40, 50, 30, 70],
  scroll_end: 5,
  toggle: [8, 20, 12],
  slider: 3,
  delete: [15, 10, 15, 10, 30],
  evolve: [10, 20, 10, 30, 15, 50, 20, 80],
  level_up: [15, 25, 20, 35, 25, 50],
  care: [5, 15, 10],
  swipe: [6, 12],
  error: [40, 20, 40],
  // Petting / affection — dual-thump mimicking a heartbeat
  heartbeat: [30, 60, 30, 200, 30, 60, 30],
  // Feeding "nom nom" — quick triple tap
  nom: [10, 40, 10, 40, 10],
};

/** Returns true if the Web Vibration API is available in this environment. */
export function isHapticSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function haptic(pattern: HapticPattern = "tap") {
  if (!isHapticSupported()) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    // Vibration API blocked (e.g. sandboxed iframe) — silently ignore
  }
}

/**
 * Haptic with visual-scale fallback for desktop / non-vibration environments.
 *
 * When vibration is unavailable, the `element` briefly scales up then returns
 * to normal — giving tactile-equivalent visual feedback.
 *
 * @param pattern  Haptic pattern to play when supported
 * @param element  DOM element to animate when vibration is unavailable
 * @param scaleUp  Peak scale value (default 1.06)
 */
export function hapticWithFallback(
  pattern: HapticPattern = "tap",
  element?: HTMLElement | null,
  scaleUp = 1.06,
): void {
  if (isHapticSupported()) {
    haptic(pattern);
    return;
  }
  if (!element) return;
  // CSS transition-based bounce — no external dependency
  const original = element.style.transform;
  const originalTransition = element.style.transition;
  element.style.transition = "transform 0.12s cubic-bezier(0.16,1,0.3,1)";
  element.style.transform = `scale(${scaleUp})`;
  setTimeout(() => {
    element.style.transform = original;
    setTimeout(() => {
      element.style.transition = originalTransition;
    }, 150);
  }, 120);
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
