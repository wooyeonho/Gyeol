/**
 * Central visual configuration for all tunable constants.
 * GUI-ready: replace `as const` with a Zustand store or Leva controls
 * when real-time browser tuning is needed.
 *
 * Usage: import { VISUAL_CONFIG, SCENE_CONFIG } from "@/lib/visual-config"
 */

// ─── Creature visual constants (procedural-creature.tsx) ───────────────────
export const VISUAL_CONFIG = {
  // Stage 1 — Material & Proportions
  outlineThicknessBody:   0.035,  // Main body outline
  outlineThicknessEye:    0.02,   // Eye outline
  outlineColor:           "black",
  eyeEmissiveIntensity:   2.5,    // Iris glow (was 0.6)
  scleraEmissiveIntensity:0.8,    // Sclera glow (was 0.5)
  eyeSizeMultiplier:      1.2,    // Overall eye scale boost (+20%)
  bodyElongationBase:     0.55,   // SD proportion — base height ratio
  bodyElongationRange:    0.7,    // SD proportion — range (total: 0.55–1.25)

  // Stage 2 — Physics & Motion
  squashStretchAmount:    0.15,   // XZ compression factor during breath
  springLambdaBase:       6,      // maath damp3 lambda base (6 = bouncy)
  headTiltX:              0.08,   // Vertical pointer → head pitch
  headTiltY:              0.10,   // Horizontal pointer → head yaw

  // Stage 4 — Rarity
  rarityParticleCount:    80,
  crystalTransmission:    0.4,
  crystalRoughness:       0.05,
  crystalRarityThreshold: 0.9,   // Only top-tier rarity gets crystal mat
  bloomRarityBoost:       1.0,   // Max bloom added at rarity=1.0
} as const;

// ─── Scene constants (void-canvas-inner.tsx) ───────────────────────────────
export const SCENE_CONFIG = {
  hudRing1InnerRadius:    1.40,
  hudRing1OuterRadius:    1.42,
  hudRing1Color:          "#4a9eff",
  hudRing1Opacity:        0.15,
  hudRing1RotSpeed:       0.003,

  hudRing2InnerRadius:    1.80,
  hudRing2OuterRadius:    1.82,
  hudRing2Color:          "#8b5cf6",
  hudRing2Opacity:        0.10,
  hudRing2RotSpeed:       0.002,

  bloomLuminanceThreshold:0.3,
  bloomLuminanceSmoothing:0.9,
  bloomMaxIntensity:      2.5,
} as const;
