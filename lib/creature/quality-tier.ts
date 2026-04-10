/**
 * Device capability detection for Three.js quality tier selection.
 *
 * Automatically downgrades rendering quality on low-end devices to maintain
 * 60 fps on budget Android phones and older iPhones.
 *
 * Usage:
 *   const tier = getQualityTier();
 *   // 'high' | 'medium' | 'low'
 */

export type QualityTier = "high" | "medium" | "low";

export interface QualitySettings {
  tier: QualityTier;
  /** Three.js pixel ratio cap */
  pixelRatio: number;
  /** Number of shadow map samples */
  shadowMapSize: number;
  /** Particle count multiplier (0–1) */
  particleMultiplier: number;
  /** Whether to render bloom post-processing */
  bloom: boolean;
  /** Whether to use high-res morph targets */
  highResMorphs: boolean;
  /** Idle animation FPS cap (use requestAnimationFrame throttle) */
  targetFps: number;
  /** Whether to enable ambient occlusion */
  ambientOcclusion: boolean;
}

const HIGH: QualitySettings = {
  tier: "high",
  pixelRatio: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 2, 3),
  shadowMapSize: 2048,
  particleMultiplier: 1.0,
  bloom: true,
  highResMorphs: true,
  targetFps: 60,
  ambientOcclusion: true,
};

const MEDIUM: QualitySettings = {
  tier: "medium",
  pixelRatio: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1.5, 2),
  shadowMapSize: 1024,
  particleMultiplier: 0.6,
  bloom: false,
  highResMorphs: true,
  targetFps: 60,
  ambientOcclusion: false,
};

const LOW: QualitySettings = {
  tier: "low",
  pixelRatio: 1,
  shadowMapSize: 512,
  particleMultiplier: 0.3,
  bloom: false,
  highResMorphs: false,
  targetFps: 30,
  ambientOcclusion: false,
};

let _cached: QualitySettings | null = null;

/**
 * Detects hardware capability and returns appropriate quality settings.
 * Result is cached after first call.
 */
export function getQualitySettings(): QualitySettings {
  if (_cached) return _cached;
  if (typeof window === "undefined") return HIGH; // SSR: assume high

  const cores = navigator.hardwareConcurrency ?? 4;
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const effectiveType = connection?.effectiveType ?? "4g";
  const memory = (performance as Performance & { memory?: { jsHeapSizeLimit?: number } }).memory?.jsHeapSizeLimit ?? Infinity;

  // Low: ≤2 cores OR on 2G/3G OR very limited memory (<256MB JS heap)
  if (cores <= 2 || effectiveType === "2g" || effectiveType === "slow-2g" || memory < 256 * 1024 * 1024) {
    _cached = LOW;
    return LOW;
  }

  // Medium: 3–4 cores OR on 3G OR limited memory
  if (cores <= 4 || effectiveType === "3g" || memory < 512 * 1024 * 1024) {
    _cached = MEDIUM;
    return MEDIUM;
  }

  _cached = HIGH;
  return HIGH;
}

/** Returns only the tier name ('high' | 'medium' | 'low'). */
export function getQualityTier(): QualityTier {
  return getQualitySettings().tier;
}

/** Allow manual override — useful for user-facing quality settings. */
export function overrideQualityTier(tier: QualityTier): void {
  _cached = { high: HIGH, medium: MEDIUM, low: LOW }[tier];
}

/** Reset override (re-detect on next call). */
export function resetQualityTier(): void {
  _cached = null;
}
