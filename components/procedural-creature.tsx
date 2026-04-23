"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CreatureDNA } from "@/lib/genome/dna";
import type { SpeciesProfile } from "@/lib/genome/species";
import { deriveMorphWeights, computeVertexDisplacements } from "@/lib/genome/morph";
import { deriveDNAAppearance, applyVitalityRegression } from "@/lib/genome/appearance";
import { calculateVisualParams } from "@/lib/genome/visual-params";
import { deriveContinuousMorphology, blendGeometryParams, type ContinuousMorphology } from "@/lib/genome/continuous-morphology";
import { deriveBodyStructure } from "@/lib/genome/body-plan";
import { Outlines } from "@react-three/drei";
import { damp, damp3 } from "maath/easing";
import { VISUAL_CONFIG } from "@/lib/visual-config";
import { CreatureBodyPlan } from "./creature-body-plan";
import type { CreatureActivity } from "@/hooks/use-creature-state";
import type { ForceState } from "@/lib/creature/force-system";
import type { IdleBehaviorParams, IdleBehavior } from "@/lib/creature/idle-behaviors";
import { getExpression, lerpExpression, type ExpressionState } from "@/lib/creature/expression-system";
import { playEmotionSound, getCreatureVoiceVolume } from "@/lib/creature/emotion-sounds";
import { getExpressedTraits, getTraitTier } from "@/lib/genome/traits";
import { computeDNAMaterialTargets, dampDNAMaterial, type DNAMaterialTargets } from "./creature/custom-shader-material";
import { calculateAliveForm } from "@/lib/creature/alive-math";

// ── Module-scope constants — allocated once, never GC'd ──────────────────────
const _MOUTH_COLOR    = new THREE.Color(0x221111);
const _MOUTH_EMISSIVE = new THREE.Color(0x110808);
const _TEAR_COLOR     = new THREE.Color(0x4488dd);
const _FOOD_COLOR     = new THREE.Color(0xddaa44);

// ── GPU wave shader — patches MeshToonMaterial vertex shader via onBeforeCompile
// Moves per-vertex sin/cos wave computation from CPU loop to GPU.
// Called once per material instance; uniforms updated every frame via userData.shader.
function patchWaveShader(shader: THREE.WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uTime    = { value: 0 };
  shader.uniforms.uWaveAmp = { value: 0.008 };
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
     float _wv = sin(transformed.x * 8.0 + uTime * 2.0)
               * cos(transformed.y * 6.0 + uTime * 1.5)
               * uWaveAmp;
     transformed += transformed * _wv;`,
  );
}

interface ProceduralCreatureProps {
  dna: CreatureDNA;
  species: SpeciesProfile;
  scale?: number;
  breathPhase?: number;
  creatureActivity?: CreatureActivity;
  excitePulse?: number;
  pointerNorm?: { x: number; y: number };
  isListening?: boolean;
  mood?: string | null;
  vitality?: number;
  /** 0..1 conversation energy */
  conversationEnergy?: number;
  /** Force-based physics state — drives emergent position/rotation/scale */
  forceState?: ForceState | null;
  /** Evolution generation level (1+, no upper bound) */
  genLevel?: number;
  /** Idle behavior visual parameters — computed from resolveIdleBehavior */
  idleBehaviorParams?: IdleBehaviorParams;
  /** Current idle behavior identifier — drives behavior-specific animations (e.g. grooming) */
  idleBehavior?: IdleBehavior;
  /** Whether the creature is currently eating (triggers chomp animation) */
  isEating?: boolean;
}

const SPHERE_DETAIL = 4;

function createArchetypeGeometry(
  archetype: string,
  radius: number,
): THREE.BufferGeometry {
  switch (archetype) {
    case "crystalline":
      return new THREE.OctahedronGeometry(radius, 1);
    case "mechanical":
      return new THREE.DodecahedronGeometry(radius, 1);
    case "volcanic":
      return new THREE.IcosahedronGeometry(radius, 1);
    case "fluid":
      return new THREE.SphereGeometry(radius, 24, 16);
    case "spectral":
      return new THREE.TetrahedronGeometry(radius, 2);
    case "verdant":
      return new THREE.DodecahedronGeometry(radius, 2);
    case "ethereal":
      return new THREE.IcosahedronGeometry(radius, SPHERE_DETAIL + 1);
    case "organic":
    default:
      return new THREE.IcosahedronGeometry(radius, SPHERE_DETAIL);
  }
}

/** Deterministic hash from seed + index for procedural variety. */
function seededRandom(seed: number, index: number): number {
  const h = Math.sin(seed * 127.1 + index * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/** Derive surface pattern type and parameters from markingsSeed. */
function derivePatternType(seed: number): {
  type: "spots" | "stripes" | "gradient" | "none";
  intensity: number;
} {
  const r = seededRandom(seed, 0);
  if (r < 0.3)
    return { type: "spots", intensity: 0.15 + seededRandom(seed, 1) * 0.25 };
  if (r < 0.55)
    return { type: "stripes", intensity: 0.12 + seededRandom(seed, 2) * 0.2 };
  if (r < 0.75)
    return { type: "gradient", intensity: 0.15 + seededRandom(seed, 3) * 0.2 };
  return { type: "none", intensity: 0 };
}

/** Rarity particle emitter — floats upward from creature body for expressed/mastered traits */
function RarityParticles({ color, intense }: { color: string; intense: boolean }) {
  const count = VISUAL_CONFIG.rarityParticleCount;
  const posRef = useRef<THREE.BufferAttribute | null>(null);
  const velRef = useRef<Float32Array>(new Float32Array(count * 3));
  const ageRef = useRef<Float32Array>(new Float32Array(count));

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 0.8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      ageRef.current[i] = Math.random();
      velRef.current[i * 3]     = (Math.random() - 0.5) * 0.002;
      velRef.current[i * 3 + 1] = 0.005 + Math.random() * 0.008;
      velRef.current[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (!posRef.current) return;
    const arr = posRef.current.array as Float32Array;
    for (let i = 0; i < count; i++) {
      ageRef.current[i] += dt * 0.3;
      if (ageRef.current[i] > 1) {
        // Reset particle to base of creature
        ageRef.current[i] = 0;
        arr[i * 3]     = (Math.random() - 0.5) * 0.6;
        arr[i * 3 + 1] = -0.3 + (Math.random() - 0.5) * 0.3;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
        velRef.current[i * 3]     = (Math.random() - 0.5) * 0.003;
        velRef.current[i * 3 + 1] = 0.005 + Math.random() * 0.01;
        velRef.current[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
      } else {
        arr[i * 3]     += velRef.current[i * 3];
        arr[i * 3 + 1] += velRef.current[i * 3 + 1];
        arr[i * 3 + 2] += velRef.current[i * 3 + 2];
      }
    }
    posRef.current.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          ref={posRef}
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={intense ? 0.018 : 0.012}
        transparent
        opacity={intense ? 0.9 : 0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * A fully procedural creature mesh driven entirely by DNA.
 *
 * Visual diversity features:
 * 1. Dual-tone coloring (primary body + secondary accent on appendages)
 * 2. DNA-driven eye variety (1-3 eyes, variable width ratios, sizes)
 * 3. Expanded appendage library (horns, antennae, tail, fins, ears, spikes)
 * 4. Surface pattern system (spots, stripes, gradient via vertex coloring)
 * 5. Emotional mouth expressions (mood-driven curve, openness, width)
 * 6. SD character proportions (0.55-1.25 body elongation)
 */
export const ProceduralCreature = React.memo(function ProceduralCreature({
  dna,
  species,
  scale = 1,
  breathPhase = 0,
  creatureActivity = "awake",
  excitePulse = 0,
  pointerNorm,
  isListening = false,
  mood,
  vitality = 1,
  conversationEnergy = 0,
  forceState,
  genLevel = 1,
  idleBehaviorParams,
  idleBehavior,
  isEating = false,
}: ProceduralCreatureProps) {
  const energy = conversationEnergy ?? 0;

  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  // Look-around behavior: target yaw + timestamp for next retarget.
  const lookTargetYawRef = useRef(0);
  const nextLookAtRef = useRef(0);
  const haloRef = useRef<THREE.Mesh>(null);
  const eyeLRef = useRef<THREE.Mesh>(null);
  const eyeRRef = useRef<THREE.Mesh>(null);
  const eyeGroupLRef = useRef<THREE.Group>(null);
  const eyeGroupRRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Mesh>(null);
  const sideLeftRef = useRef<THREE.Mesh>(null);
  const sideRightRef = useRef<THREE.Mesh>(null);
  const veilRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const tailRef = useRef<THREE.Mesh>(null);
  const hornLRef = useRef<THREE.Mesh>(null);
  const hornRRef = useRef<THREE.Mesh>(null);
  const antennaLRef = useRef<THREE.Mesh>(null);
  const antennaRRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const eyelidLRef = useRef<THREE.Mesh>(null);
  const eyelidRRef = useRef<THREE.Mesh>(null);
  const eyelidCyclopsRef = useRef<THREE.Mesh>(null);

  // ── Scratch objects — allocated once, reused every frame (no GC pressure) ──
  const _scaleVec       = useRef(new THREE.Vector3());
  const _rotTargetQuat  = useRef(new THREE.Quaternion());
  const _rotTargetEuler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  // MeshPhysicalMaterial ref — DNA-driven iridescence/sheen/Fresnel + GPU wave shader
  const meshMatRef = useRef<THREE.MeshPhysicalMaterial>(null!);

  const listeningLeanRef = useRef(0);
  const eyeScaleRef = useRef(1);
  const blinkPhaseRef = useRef(0);
  const blinkTimerRef = useRef(-1);
  const blinkStateRef = useRef<"idle" | "closing" | "opening">("idle");
  const lookTimerRef = useRef(-1);
  const lookTargetRef = useRef({ x: 0, y: 0 });
  const lookCurrentRef = useRef({ x: 0, y: 0 });
  const lookActiveRef = useRef(false);
  const lookReturnTimerRef = useRef(0);
  // Smoothly interpolated activity parameters — prevents discrete jumps between awake/drowsy/sleeping
  const activityDimRef = useRef(1);
  const activityMultRef = useRef(1);

  // Expression system — smooth lerp between mood-driven facial expressions
  const expressionRef = useRef<ExpressionState>(getExpression(mood));
  const expressionTargetRef = useRef<ExpressionState>(getExpression(mood));

  // Update expression target when mood changes
  useEffect(() => {
    expressionTargetRef.current = getExpression(mood);
  }, [mood]);

  // ── Emotion voice system — play sound on significant mood change ──
  const lastEmotionSoundMoodRef = useRef<string | null>(null);
  const lastEmotionSoundTimeRef = useRef(0);
  const EMOTION_SOUND_DEBOUNCE_MS = 5000; // max once every 5 seconds

  useEffect(() => {
    if (!mood) return;
    // Skip if same mood as last played
    if (mood === lastEmotionSoundMoodRef.current) return;
    // Debounce: skip if played too recently
    const now = Date.now();
    if (now - lastEmotionSoundTimeRef.current < EMOTION_SOUND_DEBOUNCE_MS) return;
    // Only play if page/tab is visible (creature not in background)
    if (typeof document !== "undefined" && document.hidden) return;
    // Only play if volume is audible
    if (getCreatureVoiceVolume() <= 0) return;

    lastEmotionSoundMoodRef.current = mood;
    lastEmotionSoundTimeRef.current = now;
    // DNA warmth as pitch modifier (creature-unique voice)
    const dnaModifier = dna?.warmth ?? 0.5;
    const durationMs = playEmotionSound(mood, dnaModifier);
    if (durationMs > 0) {
      vocalizingUntilRef.current = performance.now() + durationMs;
    }
  }, [mood, dna?.warmth]);

  // ── GPU wave shader: stable onBeforeCompile callback (no inline fn — prevents shader recompile)
  const handleBeforeCompile = useCallback(
    (shader: THREE.WebGLProgramParametersWithUniforms) => {
      patchWaveShader(shader);
      // Standard Three.js pattern: store on userData so useFrame can update uniforms
      if (meshMatRef.current) meshMatRef.current.userData.shader = shader;
    },
    [], // meshMatRef is a stable ref — no deps needed
  );

  // Idle behavior lerp refs — smooth transitions between idle states (rate 0.03/frame)
  const idleRotationSpeedRef = useRef(1);
  const idleBodyTiltRef = useRef(0);
  const idleScaleOscRef = useRef(0.02);
  const idleEyeOpennessRef = useRef(1);
  const idleEmissiveMultRef = useRef(1);
  const idleAppendageSpeedRef = useRef(1);
  const idleBobAmplitudeRef = useRef(0.03);
  const idleDreamParticlesRef = useRef(0);
  // Dream particle refs
  const dreamParticleRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null, null]);

  // Tail mood-driven animation state — smoothly lerped toward mood targets
  const tailAnimFreqRef = useRef(1); // current tail wag frequency (Hz)
  const tailAnimAmpRef = useRef(0.2); // current tail wag amplitude
  const tailAnimPhaseRef = useRef(0); // accumulated phase for smooth frequency changes

  // Tear particle refs (6 tear drops — max active at once)
  const tearParticleRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null, null, null]);
  const tearOffsetsRef = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (0.12 + Math.sin(i * 2.7) * 0.04),
      drift: (Math.sin(i * 1.3 + 0.5) - 0.5) * 0.02,
      phase: i * 0.5, // staggered spawn timing
      y: 0, // current fall position (reset when respawned)
      age: 0, // seconds since spawn — used for 1.5s fade-out
    })),
  );
  const tearActiveRef = useRef(0); // 0..1 lerp target for tear visibility

  // Eating animation state
  const eatingTimerRef = useRef(0); // counts down from 2s when eating starts
  const eatingActiveRef = useRef(false);
  const eatingSatisfiedRef = useRef(0); // 0..1 post-eating satisfaction pulse (decays over ~0.6s)
  const foodParticleRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const foodParticleVelocities = useRef(
    Array.from({ length: 3 }, (_, i) => ({
      x: (Math.sin(i * 2.1) - 0.5) * 0.3,
      y: 0.2 + Math.sin(i * 1.7) * 0.15,
      z: (Math.cos(i * 3.2) - 0.5) * 0.2,
      life: 0,
    })),
  );

  // Grooming animation — 2Hz head-scratch when idleBehavior === "grooming"
  const groomingPhaseRef = useRef(0);     // accumulated phase for sinusoidal scratch
  const groomingIntensityRef = useRef(0); // 0..1 smooth lerp into/out of grooming

  // Vocalization mouth sync — track active sound duration
  const vocalizingUntilRef = useRef(0);  // performance.now() timestamp until vocalizing
  const vocalMouthRef = useRef(0);       // 0..1 extra mouth-open contribution

  const baseAppearance = useMemo(
    () => deriveDNAAppearance(dna, species, genLevel),
    [dna, species, genLevel],
  );
  // Devolution visual: vitality < 1 desaturates, dims glow, shrinks particles/scale
  const appearance = useMemo(
    () => applyVitalityRegression(baseAppearance, vitality),
    [baseAppearance, vitality],
  );
  const morphWeights = useMemo(
    () => deriveMorphWeights(dna, species, genLevel),
    [dna, species, genLevel],
  );

  // Continuous morphology — fractional appendage counts, blended geometry params
  const conMorph: ContinuousMorphology = useMemo(
    () => deriveContinuousMorphology(dna, genLevel),
    [dna, genLevel],
  );
  const blendedGeo = useMemo(
    () => blendGeometryParams(conMorph.archetypeBlend, conMorph.morphComplexity),
    [conMorph],
  );

  // Continuous body structure — DNA directly drives structural parameters
  const bodyStructure = useMemo(
    () => deriveBodyStructure(dna, genLevel),
    [dna, genLevel],
  );
  // Show body plan overlay when structure is significantly evolved beyond base form
  // Thresholds high enough that Gen 1 average DNA doesn't trigger body shrink
  const hasStructure = bodyStructure.headSeparation > 0.5
    || bodyStructure.limbCount > 3
    || bodyStructure.segmentCount > 2.5
    || bodyStructure.wingSpan > 0.5
    || bodyStructure.fragmentation > 0.5
    || bodyStructure.branchCount > 1;

  // SD character proportions — shorter/rounder range than original (0.55–1.25 vs 0.5–1.7)
  const bodyElongation = useMemo(
    () => VISUAL_CONFIG.bodyElongationBase + conMorph.bodyRatio * VISUAL_CONFIG.bodyElongationRange,
    [conMorph.bodyRatio],
  );
  // Asymmetry from continuous morphology bodySymmetry (lower symmetry = more asymmetric)
  const asymmetryFactor = useMemo(
    () => Math.max(0, 1 - conMorph.bodySymmetry) * 0.15,
    [conMorph.bodySymmetry],
  );

  // Surface properties from continuous morphology
  const surfaceProps = useMemo(() => {
    // surfaceHardness: 0 = soft/organic, high = crystalline/hard
    // Affects toon gradient sharpness and emissive character
    const hardness = Math.max(0, conMorph.surfaceHardness);
    // surfaceComplexity: higher = more detailed vertex displacement
    const complexity = Math.max(0, conMorph.surfaceComplexity);
    // dnaExpressionRange: scales overall visual intensity
    const expression = conMorph.dnaExpressionRange;
    return { hardness, complexity, expression };
  }, [conMorph.surfaceHardness, conMorph.surfaceComplexity, conMorph.dnaExpressionRange]);

  // Body segments config — extra segment meshes when bodySegments > 1.5
  const bodySegmentsConfig = useMemo(() => {
    const segs = conMorph.bodySegments;
    const fullSegments = Math.floor(Math.min(segs, 5)); // max 5 visible sub-segments
    const fractional = segs - fullSegments; // partial next segment opacity
    return { count: fullSegments, fractional };
  }, [conMorph.bodySegments]);

  // Appendage variety — gates how many appendage *types* are visible
  // Higher appendageVariety = more diverse appendage types shown
  const varietyThreshold = useMemo(
    () => Math.max(0, 1 - conMorph.appendageVariety), // 0 = show all, 1 = show none
    [conMorph.appendageVariety],
  );

  // [UPGRADE 2] DNA-driven eye variety — now uses continuous eye count
  const eyeConfig = useMemo(() => {
    // Continuous eye count from morphology (e.g. 2.3 = third eye at 30% opacity)
    const contEyes = conMorph.eyeCount;
    // Floor = how many full eyes; fractional part = partial eye opacity
    const fullCount = Math.floor(Math.min(contEyes, 5));
    const _fractional = contEyes - fullCount; // reserved for future partial-eye rendering
    // For backward compat: 1 eye = cyclops mode
    const count = fullCount < 2 ? 1 : fullCount;
    const thirdEyeOpacity = count >= 2 ? Math.min(1, contEyes - 2) : 0;
    const widthRatio =
      dna.empathy > 0.6
        ? 1.2 + (dna.empathy - 0.6) * 0.5
        : dna.analytical > 0.6
          ? 0.6 + (0.8 - dna.analytical) * 0.4
          : 1.0;
    const sizeMultiplier = 0.8 + dna.warmth * 0.25 + dna.openness * 0.15;
    return { count, widthRatio, sizeMultiplier, thirdEyeOpacity };
  }, [dna, conMorph.eyeCount]);

  // [UPGRADE 3] Expanded appendage library — continuous presence from morphology
  const appendageConfig = useMemo(
    () => ({
      // Continuous: presence > 0.1 means visible, opacity = presence value
      hornPresence: Math.min(1, conMorph.hornCount / 2), // 0..1
      antennaPresence: Math.min(1, conMorph.antennaCount), // 0..1
      tailPresence: conMorph.tailPresence, // 0..1
      finWingPresence: conMorph.finWingSize, // 0..1
      earBumpPresence: conMorph.earBumpSize, // 0..1
      spikePresence: Math.min(1, conMorph.spikeCount / 4), // 0..1
      // Backward-compat booleans (threshold at 0.15)
      hasHorns: conMorph.hornCount > 0.3,
      hasAntennae: conMorph.antennaCount > 0.3,
      hasTail: conMorph.tailPresence > 0.15,
      hasFinWings: conMorph.finWingSize > 0.15,
      hasEarBumps: conMorph.earBumpSize > 0.15,
      hasSpikes: conMorph.spikeCount > 1,
      hornCurve: dna.creativity > 0.5 ? 0.3 : 0,
      tailLength: 0.15 + dna.playfulness * 0.2,
      antennaLength: 0.12 + dna.curiosity * 0.18,
      spikeCount: Math.min(12, Math.round(Math.max(0, conMorph.spikeCount))),
    }),
    [dna, conMorph],
  );

  // [UPGRADE 5] Emotional mouth expression
  const mouthConfig = useMemo(() => {
    switch (mood) {
      case "joyful": case "playful": case "excited": case "grateful": case "energetic": case "thrilled":
        return { curve: 0.8, open: 0.1, width: 1.2 };
      case "loving": case "tender": case "affectionate":
        return { curve: 0.5, open: 0.05, width: 1.0 };
      case "mischievous":
        return { curve: 0.6, open: 0.15, width: 0.9 };
      case "curious": case "puzzled":
        return { curve: 0.2, open: 0.3, width: 0.8 };
      case "surprised": case "shocked":
        return { curve: 0, open: 0.9, width: 0.7 };
      case "sad": case "melancholy": case "lonely": case "nostalgic":
        return { curve: -0.6, open: 0.05, width: 0.9 };
      case "angry": case "frustrated": case "jealous": case "envious":
        return { curve: -0.4, open: 0.2, width: 1.1 };
      case "scared": case "anxious":
        return { curve: -0.3, open: 0.5, width: 0.8 };
      case "shy": case "embarrassed":
        return { curve: 0.15, open: 0, width: 0.6 };
      case "bored": case "sleepy":
        return { curve: -0.1, open: 0.2, width: 0.7 };
      case "confused":
        return { curve: -0.15, open: 0.15, width: 0.75 };
      case "proud": case "inspired": case "confident":
        return { curve: 0.4, open: 0.1, width: 1.0 };
      case "touched":
        return { curve: 0.4, open: 0.08, width: 1.0 };
      case "thoughtful": case "contemplative":
        return { curve: 0.05, open: 0, width: 0.75 };
      case "dreamy": case "whimsical":
        return { curve: 0.2, open: 0.05, width: 0.85 };
      case "focused": case "determined":
        return { curve: 0, open: 0, width: 0.7 };
      case "peaceful": case "serene": case "calm":
        return { curve: 0.15, open: 0, width: 0.8 };
      case "creative":
        return { curve: 0.3, open: 0.1, width: 1.0 };
      case "neutral":
        return { curve: 0.05, open: 0, width: 0.8 };
      default:
        return { curve: 0.1, open: 0, width: 0.8 };
    }
  }, [mood]);

  // [UPGRADE 4] Geometry with surface pattern vertex colors + blended params
  const geometry = useMemo(() => {
    const base = createArchetypeGeometry(species.archetype, blendedGeo.radius);
    const positions = base.attributes.position.array as Float32Array;

    const displacements = computeVertexDisplacements(positions, morphWeights);
    // surfaceComplexity scales vertex displacement amplitude
    const complexityScale = 1 + surfaceProps.complexity * 0.8;
    const morphed = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const px = positions[i] + displacements[i] * complexityScale;
      const py = positions[i + 1] + displacements[i + 1] * complexityScale;
      const pz = positions[i + 2] + displacements[i + 2] * complexityScale;

      const xzSquash = 1 / Math.sqrt(bodyElongation);
      morphed[i] = px * xzSquash;
      morphed[i + 1] = py * bodyElongation;
      morphed[i + 2] = pz * xzSquash;

      if (asymmetryFactor > 0.001) {
        const hash = Math.sin(px * 127.1 + py * 311.7 + pz * 74.7) * 43758.5453;
        const frac = hash - Math.floor(hash);
        const offset = (frac - 0.5) * asymmetryFactor;
        morphed[i] += offset;
        morphed[i + 1] += offset * 0.5;
        morphed[i + 2] += offset * 0.7;
      }
    }

    base.setAttribute("position", new THREE.BufferAttribute(morphed, 3));

    // Surface pattern: vertex colors for spots/stripes/gradient
    const pattern = derivePatternType(appearance.markingsSeed);
    if (pattern.type !== "none") {
      const vertCount = morphed.length / 3;
      const colors = new Float32Array(vertCount * 3);
      const seed = appearance.markingsSeed;
      for (let vi = 0; vi < vertCount; vi++) {
        const vx = morphed[vi * 3];
        const vy = morphed[vi * 3 + 1];
        const vz = morphed[vi * 3 + 2];
        let blend = 0;
        if (pattern.type === "spots") {
          const spotFreq = 4 + seededRandom(seed, 10) * 6;
          const n =
            Math.sin(vx * spotFreq + seed * 0.1) *
            Math.cos(vy * spotFreq * 0.8 + seed * 0.3) *
            Math.sin(vz * spotFreq * 1.2 + seed * 0.7);
          blend = n > 0.3 ? pattern.intensity : 0;
        } else if (pattern.type === "stripes") {
          const stripeAngle = seededRandom(seed, 20) * Math.PI;
          const coord = vy * Math.cos(stripeAngle) + vx * Math.sin(stripeAngle);
          const stripeFreq = 6 + seededRandom(seed, 21) * 8;
          blend = Math.sin(coord * stripeFreq) > 0.4 ? pattern.intensity : 0;
        } else if (pattern.type === "gradient") {
          const tVal = Math.max(0, Math.min(1, (vy + 0.5) / 1.2));
          blend = tVal * pattern.intensity;
        }
        colors[vi * 3] = 1.0 - blend * 0.3;
        colors[vi * 3 + 1] = 1.0 - blend * 0.1;
        colors[vi * 3 + 2] = 1.0 + blend * 0.2;
      }
      base.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }

    base.computeVertexNormals();
    (
      base.attributes.position as THREE.BufferAttribute & {
        _basePositions?: Float32Array;
      }
    )._basePositions = new Float32Array(morphed);
    return base;
  }, [morphWeights, species.archetype, bodyElongation, asymmetryFactor, appearance.markingsSeed, blendedGeo, surfaceProps.complexity]);

  // [UPGRADE 1] Dual-tone colors
  const primaryColor = useMemo(() => {
    const h = appearance.primaryHue / 360;
    const s = appearance.primarySaturation / 100;
    const l = appearance.primaryLightness / 100;
    return new THREE.Color().setHSL(h, s, l);
  }, [appearance]);

  const secondaryColor = useMemo(() => {
    const h2 = ((appearance.primaryHue + appearance.secondaryHueShift) % 360) / 360;
    const s2 = Math.max(0.3, appearance.primarySaturation / 100 - 0.05);
    const l2 = Math.min(0.85, appearance.primaryLightness / 100 + 0.08);
    return new THREE.Color().setHSL(h2, s2, l2);
  }, [appearance]);

  const eyeColor = useMemo(() => {
    return new THREE.Color().setHSL(appearance.eyeHue / 360, 0.75, 0.6);
  }, [appearance]);


  const eyePositions = useMemo(() => {
    const spread = eyeConfig.count === 1 ? 0 : 0.16 * (1 + morphWeights.sideSpread * 0.3);
    const height = 0.2 * (1 + morphWeights.bodyStretch * 0.4 + morphWeights.crownGrowth * 0.3);
    const depth = 0.34 * (1 + morphWeights.bodyBulge * 0.15);
    return {
      left: [-spread, height, depth] as [number, number, number],
      right: [spread, height, depth] as [number, number, number],
      center: [0, height + 0.1, depth * 0.9] as [number, number, number],
    };
  }, [morphWeights, eyeConfig.count]);

  // SD eye proportions — 20% larger for cuter, more expressive look
  const eyeSize = 0.068 * VISUAL_CONFIG.eyeSizeMultiplier * (1 + morphWeights.bodyBulge * 0.2) * eyeConfig.sizeMultiplier;

  const moodMod = useMemo(() => {
    switch (mood) {
      case "joyful": case "energetic":
        return { emissiveBoost: 0.2, speedMult: 1.3, tiltBias: 0.02, eyeSquint: 0.6, pupilScale: 1.1, auraColor: "#ffdd44", auraOpacity: 0.18, bodySquash: 0.92, bodyStretch: 1.08 };
      case "playful": case "mischievous":
        return { emissiveBoost: 0.18, speedMult: 1.4, tiltBias: 0.05, eyeSquint: 0.7, pupilScale: 1.15, auraColor: "#ff88cc", auraOpacity: 0.17, bodySquash: 0.88, bodyStretch: 1.12 };
      case "excited": case "thrilled":
        return { emissiveBoost: 0.3, speedMult: 1.6, tiltBias: 0.03, eyeSquint: 0.55, pupilScale: 1.2, auraColor: "#ffaa00", auraOpacity: 0.24, bodySquash: 0.85, bodyStretch: 1.15 };
      case "proud": case "confident":
        return { emissiveBoost: 0.22, speedMult: 1.1, tiltBias: 0.06, eyeSquint: 0.75, pupilScale: 0.95, auraColor: "#ffd700", auraOpacity: 0.2, bodySquash: 1.05, bodyStretch: 1.05 };
      case "inspired": case "creative":
        return { emissiveBoost: 0.2, speedMult: 1.2, tiltBias: 0.04, eyeSquint: 0.85, pupilScale: 1.25, auraColor: "#88ffdd", auraOpacity: 0.18, bodySquash: 0.95, bodyStretch: 1.06 };
      case "loving": case "tender": case "affectionate":
        return { emissiveBoost: 0.15, speedMult: 0.9, tiltBias: 0.03, eyeSquint: 0.65, pupilScale: 1.3, auraColor: "#ff6699", auraOpacity: 0.2, bodySquash: 0.94, bodyStretch: 1.04 };
      case "curious":
        return { emissiveBoost: 0.08, speedMult: 1.1, tiltBias: 0.04, eyeSquint: 1.0, pupilScale: 1.3, auraColor: "#44ddaa", auraOpacity: 0.14, bodySquash: 1.0, bodyStretch: 1.02 };
      case "thoughtful": case "contemplative":
        return { emissiveBoost: 0.05, speedMult: 0.7, tiltBias: 0.01, eyeSquint: 0.9, pupilScale: 1.1, auraColor: "#7788cc", auraOpacity: 0.12, bodySquash: 1.0, bodyStretch: 1.0 };
      case "dreamy": case "whimsical":
        return { emissiveBoost: 0.1, speedMult: 0.6, tiltBias: 0.02, eyeSquint: 0.8, pupilScale: 1.2, auraColor: "#cc88ff", auraOpacity: 0.16, bodySquash: 0.97, bodyStretch: 1.03 };
      case "focused": case "determined":
        return { emissiveBoost: 0.12, speedMult: 1.0, tiltBias: -0.01, eyeSquint: 0.7, pupilScale: 0.85, auraColor: "#44aaff", auraOpacity: 0.15, bodySquash: 1.02, bodyStretch: 1.0 };
      case "peaceful": case "serene": case "calm":
        return { emissiveBoost: 0.02, speedMult: 0.5, tiltBias: 0, eyeSquint: 0.85, pupilScale: 1.05, auraColor: "#aaddff", auraOpacity: 0.1, bodySquash: 1.0, bodyStretch: 1.0 };
      case "neutral":
        return { emissiveBoost: 0, speedMult: 1, tiltBias: 0, eyeSquint: 1.0, pupilScale: 1.0, auraColor: "#ffffff", auraOpacity: 0.08, bodySquash: 1.0, bodyStretch: 1.0 };
      case "melancholy": case "sad":
        return { emissiveBoost: -0.1, speedMult: 0.5, tiltBias: -0.06, eyeSquint: 1.0, pupilScale: 1.2, auraColor: "#4466cc", auraOpacity: 0.12, bodySquash: 1.0, bodyStretch: 0.95 };
      case "lonely": case "nostalgic":
        return { emissiveBoost: -0.05, speedMult: 0.55, tiltBias: -0.04, eyeSquint: 0.95, pupilScale: 1.15, auraColor: "#6644aa", auraOpacity: 0.13, bodySquash: 0.98, bodyStretch: 0.97 };
      case "angry": case "frustrated":
        return { emissiveBoost: 0.25, speedMult: 1.6, tiltBias: -0.02, eyeSquint: 0.5, pupilScale: 0.8, auraColor: "#ff3333", auraOpacity: 0.22, bodySquash: 1.06, bodyStretch: 0.96 };
      case "scared": case "anxious":
        return { emissiveBoost: 0.05, speedMult: 1.4, tiltBias: -0.03, eyeSquint: 1.0, pupilScale: 1.5, auraColor: "#aa44ff", auraOpacity: 0.16, bodySquash: 0.9, bodyStretch: 1.1 };
      case "shy": case "embarrassed":
        return { emissiveBoost: 0.08, speedMult: 0.8, tiltBias: -0.05, eyeSquint: 0.6, pupilScale: 0.9, auraColor: "#ff99aa", auraOpacity: 0.14, bodySquash: 0.93, bodyStretch: 0.98 };
      case "jealous": case "envious":
        return { emissiveBoost: 0.15, speedMult: 1.2, tiltBias: -0.03, eyeSquint: 0.55, pupilScale: 0.85, auraColor: "#44cc44", auraOpacity: 0.18, bodySquash: 1.04, bodyStretch: 0.98 };
      case "bored": case "sleepy":
        return { emissiveBoost: -0.08, speedMult: 0.4, tiltBias: -0.07, eyeSquint: 0.5, pupilScale: 0.9, auraColor: "#888899", auraOpacity: 0.08, bodySquash: 1.02, bodyStretch: 0.93 };
      case "surprised": case "shocked":
        return { emissiveBoost: 0.2, speedMult: 1.5, tiltBias: 0.01, eyeSquint: 1.3, pupilScale: 1.6, auraColor: "#ffff44", auraOpacity: 0.2, bodySquash: 0.85, bodyStretch: 1.18 };
      case "confused": case "puzzled":
        return { emissiveBoost: 0.04, speedMult: 0.9, tiltBias: 0.06, eyeSquint: 1.1, pupilScale: 1.15, auraColor: "#ddaa44", auraOpacity: 0.13, bodySquash: 0.98, bodyStretch: 1.01 };
      case "grateful": case "touched":
        return { emissiveBoost: 0.12, speedMult: 0.85, tiltBias: 0.02, eyeSquint: 0.7, pupilScale: 1.2, auraColor: "#ffccaa", auraOpacity: 0.17, bodySquash: 0.96, bodyStretch: 1.03 };
      default:
        return { emissiveBoost: 0, speedMult: 1, tiltBias: 0, eyeSquint: 1.0, pupilScale: 1.0, auraColor: "#ffffff", auraOpacity: 0.08, bodySquash: 1.0, bodyStretch: 1.0 };
    }
  }, [mood]);

  const moodAuraColor = useMemo(() => new THREE.Color(moodMod.auraColor), [moodMod.auraColor]);

  // activityDim/Mult are smoothly interpolated inside useFrame (no discrete jumps)
  const activityDimTarget = creatureActivity === "sleeping" ? 0.45 : creatureActivity === "drowsy" ? 0.7 : 1;
  const activityMultTarget = creatureActivity === "sleeping" ? 0.3 : creatureActivity === "drowsy" ? 0.6 : 1;
  const activityDim = activityDimTarget; // static fallback for JSX outside useFrame

  // DNA-to-geometry visual params — drives material, surface, and particle overrides.
  // Computed once per DNA change via useMemo; propagated to CreatureBodyPlan.
  const visualParams = useMemo(() => calculateVisualParams(dna), [dna]);

  // DNA physical material targets — computed once on mount for JSX initialisation;
  // updated via dnaMaterialTargetsRef in useEffect so useFrame can damp smoothly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initMatTargets: DNAMaterialTargets = useMemo(() => computeDNAMaterialTargets(dna), []);
  const dnaMaterialTargetsRef = useRef<DNAMaterialTargets>(initMatTargets);
  useEffect(() => { dnaMaterialTargetsRef.current = computeDNAMaterialTargets(dna); }, [dna]);
  const initMatSheenColor = useMemo(
    () => new THREE.Color(initMatTargets.sheenColorR, initMatTargets.sheenColorG, initMatTargets.sheenColorB),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // dnaExpressionRange scales overall emissive intensity — high-gen creatures glow more.
  // visualParams.emissiveBoost is applied inside CreatureBodyPlan directly.
  const emissiveIntensity = Math.max(0.1, (appearance.glowIntensity * 0.45 + moodMod.emissiveBoost) * activityDim * (0.85 + surfaceProps.expression * 0.15));

  // Dispose previous geometry on change or unmount to prevent GPU memory leak
  useEffect(() => {
    return () => { geometry.dispose(); };
  }, [geometry]);

  const hasVertexColors = useMemo(
    () => derivePatternType(appearance.markingsSeed).type !== "none",
    [appearance.markingsSeed],
  );

  // 3-band toon gradient driven by DNA color — LinearFilter softens band edges slightly
  // so the result reads as "high-end 2D animation" rather than Flash-era toon shading.
  // Each band spans 3 pixels with overlapping stops to create a subtle feathered boundary.
  const toonGradient = useMemo(() => {
    // Boost saturation +0.15 beyond primary for pop-cartoon vibrancy
    const shadowL    = Math.max(0, appearance.primaryLightness / 100 - 0.25);
    const midL       = appearance.primaryLightness / 100;
    const highlightL = Math.min(1, appearance.primaryLightness / 100 + 0.30);
    const toVal = (l: number) => Math.round(Math.max(0, Math.min(255, l * 255)));
    const colors = new Uint8Array([
      toVal(shadowL),           toVal(shadowL + 0.04),    toVal(shadowL + 0.08),    // shadow band (3px)
      toVal(midL - 0.04),       toVal(midL),              toVal(midL + 0.04),       // mid band (3px)
      toVal(highlightL - 0.08), toVal(highlightL - 0.04), toVal(highlightL),        // highlight band (3px)
    ]);
    const tex = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [appearance.primaryLightness]);
  // Dispose previous GPU texture when hardness changes or on unmount
  useEffect(() => {
    return () => { toonGradient.dispose(); };
  }, [toonGradient]);

  const mouthPos = useMemo((): [number, number, number] => {
    const height = 0.06 * (1 + morphWeights.bodyStretch * 0.3);
    const depth = 0.38 * (1 + morphWeights.bodyBulge * 0.12);
    return [0, height, depth];
  }, [morphWeights]);

  // Rarity visual system — expressed/mastered traits trigger particle effects
  const rarityInfo = useMemo(() => {
    const expressed = getExpressedTraits(dna);
    if (expressed.length === 0) return { active: false, intense: false, color: "#60a5fa" };
    const hasMastered = expressed.some((t) => getTraitTier(dna, t) === "mastered");
    const hasExpressed = expressed.some((t) => getTraitTier(dna, t) === "expressed");
    const glowColor = expressed[0]?.visualEffect.glowColor ?? "#60a5fa";
    return { active: hasMastered || hasExpressed, intense: hasMastered, color: glowColor };
  }, [dna]);

  // Crystal material — only for top-tier rarity crystalline archetypes
  const isCrystalline = species.archetype === "crystalline" && (species.rarity ?? 0) > VISUAL_CONFIG.crystalRarityThreshold;

  // Spring lambda — DNA personality + current mood drive movement feel:
  // playful/excited = low lambda (bouncy jelly), intensity/sad = high or low lambda
  const springLambda = useMemo(() => {
    const m = mood?.toLowerCase() ?? "";
    const moodMult = (m === "sad" || m === "melancholy" || m === "tired") ? 0.5
                   : (m === "joyful" || m === "excited" || m === "playful") ? 1.6
                   : 1.0;
    return VISUAL_CONFIG.springLambdaBase
      * (0.6 + dna.intensity * 0.8)
      / (0.5 + dna.playfulness * 0.5)
      * moodMult;
  }, [dna.intensity, dna.playfulness, mood]);

  // Animation loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;
    const dt = delta; // R3F provides accurate per-frame delta as 2nd arg — never call getDelta() here

    // Smoothly damp activity parameters toward target — frame-rate independent (λ=2.5 ≈ 0.04/frame@60fps)
    damp(activityDimRef, "current", activityDimTarget, 2.5, dt);
    damp(activityMultRef, "current", activityMultTarget, 2.5, dt);
    const activityMult = activityMultRef.current;
    const smoothActivityDim = activityDimRef.current;

    // Damp idle behavior params toward targets — λ=1.8 ≈ 0.03/frame@60fps
    if (idleBehaviorParams) {
      damp(idleRotationSpeedRef,  "current", idleBehaviorParams.rotationSpeed,               1.8, dt);
      damp(idleBodyTiltRef,       "current", idleBehaviorParams.bodyTilt,                    1.8, dt);
      damp(idleScaleOscRef,       "current", idleBehaviorParams.scaleOscillation,            1.8, dt);
      damp(idleEyeOpennessRef,    "current", idleBehaviorParams.eyeOpenness,                 1.8, dt);
      damp(idleEmissiveMultRef,   "current", idleBehaviorParams.emissiveMult,                1.8, dt);
      damp(idleAppendageSpeedRef, "current", idleBehaviorParams.appendageSpeed,              1.8, dt);
      damp(idleBobAmplitudeRef,   "current", idleBehaviorParams.bobAmplitude,                1.8, dt);
      damp(idleDreamParticlesRef, "current", idleBehaviorParams.showDreamParticles ? 1 : 0,  1.8, dt);
    }

    // Grooming animation — 2Hz head-scratch when behavior = "grooming"
    const groomingTarget = idleBehavior === "grooming" ? 1 : 0;
    damp(groomingIntensityRef, "current", groomingTarget, 1.8, dt);
    if (groomingIntensityRef.current > 0.01) {
      groomingPhaseRef.current += dt * 2.0 * Math.PI * 2; // 2 Hz
    }

    // Vocal mouth sync — λ=7.7 ≈ 0.12/frame@60fps
    const isVocalizing = performance.now() < vocalizingUntilRef.current;
    damp(vocalMouthRef, "current", isVocalizing ? 1 : 0, 7.7, dt);

    // Wire: expression-system → smooth facial expression lerp each frame
    // Expression lerp — convert alpha to frame-independent: α=1-exp(-λ·dt), λ=2.5≈0.04/frame@60fps
    const exprAlpha = 1 - Math.exp(-2.5 * dt);
    expressionRef.current = lerpExpression(expressionRef.current, expressionTargetRef.current, exprAlpha);
    const expr = expressionRef.current;

    const leanTarget = isListening ? 0.12 : 0;
    damp(listeningLeanRef, "current", leanTarget, 3.7, dt); // λ=3.7≈0.06/frame@60fps
    const eyeScaleTarget = isListening ? 1.25 : 1;
    damp(eyeScaleRef, "current", eyeScaleTarget, 5.0, dt); // λ=5.0≈0.08/frame@60fps

    if (blinkTimerRef.current < 0) blinkTimerRef.current = 2 + Math.random() * 3;
    if (lookTimerRef.current < 0) lookTimerRef.current = 4 + Math.random() * 6;
    const blinkSpeed = creatureActivity === "sleeping" ? 0.5 : creatureActivity === "drowsy" ? 0.7 : 1;
    blinkTimerRef.current -= dt;
    if (blinkTimerRef.current <= 0 && blinkStateRef.current === "idle") {
      blinkStateRef.current = "closing";
    }
    if (blinkStateRef.current === "closing") {
      blinkPhaseRef.current = Math.min(1, blinkPhaseRef.current + (dt / 0.07) * blinkSpeed);
      if (blinkPhaseRef.current >= 1) blinkStateRef.current = "opening";
    } else if (blinkStateRef.current === "opening") {
      blinkPhaseRef.current = Math.max(0, blinkPhaseRef.current - (dt / 0.12) * blinkSpeed);
      if (blinkPhaseRef.current <= 0) {
        blinkStateRef.current = "idle";
        const baseInterval = mood === "joyful" || mood === "energetic" ? 2 : mood === "melancholy" ? 6 : 3.5;
        blinkTimerRef.current = baseInterval + Math.random() * 3;
      }
    }
    // Wire: expression-system eyeOpenness modulates eye Y scale alongside blink + mood
    const eyeOpenY = (1 - blinkPhaseRef.current) * moodMod.eyeSquint * idleEyeOpennessRef.current * expr.eyeOpenness;

    lookTimerRef.current -= dt;
    if (lookTimerRef.current <= 0 && !lookActiveRef.current && creatureActivity === "awake") {
      lookActiveRef.current = true;
      lookReturnTimerRef.current = 1.2 + Math.random() * 1.6;
      lookTargetRef.current = { x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 0.5 };
    }
    if (lookActiveRef.current) {
      damp(lookCurrentRef.current, "x", lookTargetRef.current.x, 2.5, dt);
      damp(lookCurrentRef.current, "y", lookTargetRef.current.y, 2.5, dt);
      lookReturnTimerRef.current -= dt;
      if (lookReturnTimerRef.current <= 0) {
        lookActiveRef.current = false;
        lookTimerRef.current = 5 + Math.random() * 8;
        lookTargetRef.current = { x: 0, y: 0 };
      }
    } else {
      damp(lookCurrentRef.current, "x", 0, 3.7, dt);
      damp(lookCurrentRef.current, "y", 0, 3.7, dt);
    }

    const energyMult = 1 + energy * 0.5;
    // Alive Math: organic pulse replaces static sin — adds breath + jitter + micro-distortion
    // baseSize=12.5 so primary breath amplitude = 12.5*0.08 = 1.0  →  oscillates ~[-1,1] like old Math.sin()
    // jitter adds ±0.25 organic wobble; subtract baseSize to center around 0
    const aliveTime = breathPhase * Math.PI * 2 * moodMod.speedMult * energyMult;
    const breathSin = calculateAliveForm(aliveTime, 12.5, energy * 0.002) - 12.5;
    const heartbeat = Math.pow(Math.max(0, Math.sin(breathPhase * Math.PI * 4)), 3) * (0.03 + energy * 0.04);

    // ─── PHYSICS LOGIC ────────────────────────────────────────────────────
    // Scale: Squash & Stretch — Y expands on exhale while XZ compresses (and vice versa)
    const idleScaleOsc = idleScaleOscRef.current;
    const forceScalePulse = forceState ? forceState.scalePulse : 1;
    const breathScale = forceState
      ? forceScalePulse + excitePulse * 0.12 + Math.sin(t * 1.5) * idleScaleOsc
      : 1 + breathSin * appearance.breatheDepth * energyMult + heartbeat + excitePulse * 0.12 + Math.sin(t * 1.5) * idleScaleOsc;
    const scBase = scale * appearance.scale;
    // XZ squash inversely proportional to Y stretch for volume-preserving elasticity
    const stretchY  = scBase * breathScale;
    const squashXZ  = scBase / Math.sqrt(Math.max(0.5, breathScale)) * (1 + (breathScale - 1) * VISUAL_CONFIG.squashStretchAmount * 0.5);
    _scaleVec.current.set(squashXZ, stretchY, squashXZ);
    damp3(groupRef.current.scale, _scaleVec.current, 5.0, dt);

    // Position: spring physics — damp3 gives frame-rate-independent damped spring
    // lambda drives convergence speed: sad mood → slow/droopy, excited → bouncy
    const idleBob = Math.sin(t * 1.8) * idleBobAmplitudeRef.current;
    const targetX = forceState ? forceState.position.x * 1.5 : 0;
    const targetY = forceState ? forceState.position.y * 1.2 + idleBob : idleBob;
    damp3(groupRef.current.position, [targetX, targetY, groupRef.current.position.z], springLambda, dt);

    // Rotation: target-seeking look-around (not continuous spin).
    // The creature picks a new yaw target every few seconds and lerps toward
    // it, so it "glances around" instead of turning endlessly. Rotation speed
    // from DNA/idle modulates how quickly it reaches the target + how often.
    const idleRotSpeed = idleRotationSpeedRef.current;
    const lookSpeed = appearance.idleRotation * activityMult * moodMod.speedMult * energyMult * idleRotSpeed;
    const forceRotation = forceState ? forceState.rotation * 0.15 : 0;
    if (t >= nextLookAtRef.current) {
      // Pick a new target yaw in ±1.2 rad and schedule next retarget
      // (2–6s depending on activity; faster creatures look around more).
      const seed = seededRandom(appearance.markingsSeed ?? 1, Math.floor(t * 7.3));
      lookTargetYawRef.current = (seed - 0.5) * 2.4;
      const pauseRange = 4 / (0.5 + lookSpeed * 2); // faster lookSpeed → shorter pauses
      nextLookAtRef.current = t + 2 + seededRandom(appearance.markingsSeed ?? 1, Math.floor(t * 11.7)) * pauseRange;
    }
    const yawLerpRate = 0.02 + lookSpeed * 0.03;
    const groomingScratch = Math.sin(groomingPhaseRef.current) * groomingIntensityRef.current * 0.12;
    const baseRotX = Math.sin(t * 0.3 * activityMult) * 0.05 + moodMod.tiltBias + idleBodyTiltRef.current + groomingScratch;

    // Pointer influence — computed early so quaternion and eye-tracking share the same pn values
    const rawPn = creatureActivity === "sleeping" ? { x: 0, y: 0 } : (pointerNorm ?? { x: 0, y: 0 });
    const pn = { x: rawPn.x + lookCurrentRef.current.x, y: rawPn.y + lookCurrentRef.current.y };

    // ── Quaternion rotation (replaces dual Euler lerp + rotation.x double-set)
    // All three axes unified in one slerp → no gimbal artifact, shortest-path interpolation.
    {
      const targetRotX = baseRotX - rawPn.y * VISUAL_CONFIG.headTiltX;
      const targetRotY = lookTargetYawRef.current + forceRotation * 0.5 + rawPn.x * VISUAL_CONFIG.headTiltY;
      const targetRotZ = listeningLeanRef.current + forceRotation * 0.3
                       + Math.cos(groomingPhaseRef.current * 0.5) * groomingIntensityRef.current * 0.05;
      _rotTargetEuler.current.set(targetRotX, targetRotY, targetRotZ, "YXZ");
      _rotTargetQuat.current.setFromEuler(_rotTargetEuler.current);
      // Convert yawLerpRate (per-frame alpha) to lambda for frame-independent slerp
      const slerpLambda = Math.max(1, -Math.log(1 - Math.min(0.99, yawLerpRate)) * 60);
      groupRef.current.quaternion.slerp(_rotTargetQuat.current, 1 - Math.exp(-slerpLambda * dt));
    }

    if (meshRef.current) {
      const squashTarget = moodMod.bodySquash * (excitePulse > 0.1 ? 1 - excitePulse * 0.15 : 1);
      const stretchTarget = moodMod.bodyStretch * (excitePulse > 0.1 ? 1 + excitePulse * 0.12 : 1);
      damp(meshRef.current.scale, "x", squashTarget, 3.7, dt)
      damp(meshRef.current.scale, "z", squashTarget, 3.7, dt)
      damp(meshRef.current.scale, "y", stretchTarget, 3.7, dt)
    }

    // ── GPU wave shader uniform update (replaces CPU vertex loop)
    // sin/cos wave computation now runs entirely on GPU via patchWaveShader / onBeforeCompile.
    // early-exit when amplitude is negligible avoids unnecessary uniform writes.
    const waveAmp = 0.008 * activityMult * moodMod.speedMult * energyMult;
    if (waveAmp >= 0.001 && meshMatRef.current?.userData.shader) {
      meshMatRef.current.userData.shader.uniforms.uTime.value    = t;
      meshMatRef.current.userData.shader.uniforms.uWaveAmp.value = waveAmp;
    }
    // DNA physical material smooth morphing — frame-rate independent
    if (meshMatRef.current) {
      dampDNAMaterial(meshMatRef.current, dnaMaterialTargetsRef.current, dt);
    }

    if (haloRef.current) {
      const haloPulse = 1.08 + Math.sin(t * 0.8 * energyMult) * 0.03 + excitePulse * 0.05 + energy * 0.04;
      haloRef.current.scale.setScalar(haloPulse);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity =
        (moodMod.auraOpacity + appearance.glowIntensity * 0.12 + moodMod.emissiveBoost * 0.04 + energy * 0.06) * smoothActivityDim * idleEmissiveMultRef.current * 0.35;
    }

    // pn/rawPn computed above in quaternion section — reused here for eye tracking
    for (const eyeRef of [eyeLRef, eyeRRef]) {
      if (eyeRef.current) {
        damp(eyeRef.current.position, "x", pn.x * eyeSize * 0.3, 5.0, dt)
        damp(eyeRef.current.position, "y", -pn.y * eyeSize * 0.3, 5.0, dt)
      }
    }

    const es = eyeScaleRef.current;
    const ps = moodMod.pupilScale;
    const wr = eyeConfig.widthRatio;
    if (eyeGroupLRef.current) eyeGroupLRef.current.scale.set(es, es * eyeOpenY * wr, es * ps);
    if (eyeGroupRRef.current) eyeGroupRRef.current.scale.set(es, es * eyeOpenY * wr, es * ps);

    // Pupil dilation — expression-driven iris scaling (λ=5.0≈0.08/frame@60fps)
    const pupilDilation = expr.pupilScale;
    for (const eyeRef of [eyeLRef, eyeRRef]) {
      if (eyeRef.current) {
        const irisScale = pupilDilation;
        damp(eyeRef.current.scale, "x", irisScale, 5.0, dt);
        damp(eyeRef.current.scale, "y", irisScale, 5.0, dt);
        damp(eyeRef.current.scale, "z", irisScale, 5.0, dt);
      }
    }

    // Eyelid droop — expression-driven eyelid coverage (λ=3.7≈0.06/frame@60fps)
    const eyelidScale = Math.max(0.01, expr.eyelidDroop);
    for (const lidRef of [eyelidLRef, eyelidRRef, eyelidCyclopsRef]) {
      if (lidRef.current) {
        damp(lidRef.current.scale, "y", eyelidScale, 3.7, dt)
      }
    }

    // Crown sway — modulated by idle appendage speed
    const idleAppSpeed = idleAppendageSpeedRef.current;
    if (crownRef.current) {
      const windPhase = t * 1.2 * idleAppSpeed + 0.5;
      crownRef.current.rotation.x = Math.sin(windPhase) * 0.12 * activityMult + breathSin * 0.06;
      crownRef.current.rotation.z = Math.cos(windPhase * 0.7) * 0.08 * activityMult;
      crownRef.current.scale.setScalar(1 + breathSin * 0.05);
    }
    // Side appendage animation is now handled in the mood-driven tail/appendage section below
    for (let vi = 0; vi < 3; vi++) {
      const veilMesh = veilRefs.current[vi];
      if (!veilMesh) continue;
      const phase = t * 0.6 + vi * ((Math.PI * 2) / 3);
      veilMesh.rotation.x = Math.sin(phase) * 0.2 * activityMult + breathSin * 0.1;
      veilMesh.rotation.z = Math.cos(phase * 0.8 + 0.5) * 0.15 * activityMult;
      veilMesh.scale.y = 1 + breathSin * 0.04;
    }

    // ── Tail/Appendage mood-driven animation ──────────────────────────
    // Derive target frequency and amplitude from current mood.
    // DNA playfulness influences the base wag speed — playful creatures
    // always have a bit more tail motion even in neutral states.
    const playfulnessBaseFreq = 0.8 + dna.playfulness * 0.6; // 0.8-1.4Hz base from DNA
    const playfulnessBaseAmp = 0.15 + dna.playfulness * 0.1; // 0.15-0.25 base from DNA
    let tailTargetFreq = playfulnessBaseFreq;
    let tailTargetAmp = playfulnessBaseAmp;
    const moodLower = mood ?? "";
    if (moodLower === "joyful" || moodLower === "excited" || moodLower === "thrilled" || moodLower === "playful" || moodLower === "energetic") {
      // Happy/excited: fast wagging 3-4Hz, large amplitude — playfulness amplifies further
      tailTargetFreq = 3.0 + dna.playfulness * 1.0; // 3-4Hz
      tailTargetAmp = 0.3 + dna.playfulness * 0.2;  // 0.3-0.5
    } else if (moodLower === "sad" || moodLower === "melancholy" || moodLower === "lonely" || moodLower === "nostalgic" || moodLower === "crying") {
      // Sad/lonely/crying: slow drooping — playfulness has minimal effect
      tailTargetFreq = 0.3 + dna.playfulness * 0.2;
      tailTargetAmp = 0.06 + dna.playfulness * 0.04;
    } else if (moodLower === "scared" || moodLower === "anxious" || moodLower === "terrified" || moodLower === "nervous") {
      // Scared: tucked tight
      tailTargetFreq = 0.3;
      tailTargetAmp = 0.02; // near zero
    } else if (moodLower === "angry" || moodLower === "frustrated") {
      tailTargetFreq = 2.5;
      tailTargetAmp = 0.25;
    }
    // Smooth lerp toward mood targets
    const tailLerpRate = 0.03;
    tailAnimFreqRef.current += (tailTargetFreq - tailAnimFreqRef.current) * tailLerpRate;
    tailAnimAmpRef.current += (tailTargetAmp - tailAnimAmpRef.current) * tailLerpRate;
    // Accumulate phase using current frequency for smooth transitions
    tailAnimPhaseRef.current += dt * tailAnimFreqRef.current * Math.PI * 2;
    const tailPhase = tailAnimPhaseRef.current;
    const tailAmp = tailAnimAmpRef.current * activityMult * idleAppSpeed;

    // Apply mood-driven animation to tail
    if (tailRef.current) {
      tailRef.current.rotation.x = Math.sin(tailPhase) * tailAmp;
      tailRef.current.rotation.y = Math.cos(tailPhase * 0.7) * tailAmp * 0.5;
      // Sad moods droop the tail downward
      const droopTarget = (moodLower === "sad" || moodLower === "melancholy" || moodLower === "lonely") ? -0.3 : 0;
      damp(tailRef.current.rotation, "z", droopTarget, 2.5, dt)
      tailRef.current.scale.y = 1 + breathSin * 0.03;
    }
    // Apply mood-driven speed to side appendages (wings/fins)
    if (sideLeftRef.current) {
      const flapPhase = tailPhase * 0.5;
      sideLeftRef.current.rotation.z = 0.4 + Math.sin(flapPhase) * tailAmp * 0.5 + breathSin * 0.08;
      sideLeftRef.current.position.y = Math.sin(flapPhase * 1.3) * tailAmp * 0.1;
    }
    if (sideRightRef.current) {
      const flapPhase = tailPhase * 0.5 + Math.PI * 0.3;
      sideRightRef.current.rotation.z = -0.4 - Math.sin(flapPhase) * tailAmp * 0.5 - breathSin * 0.08;
      sideRightRef.current.position.y = Math.sin(flapPhase * 1.3) * tailAmp * 0.1;
    }
    // Horn pulse
    if (hornLRef.current) hornLRef.current.scale.setScalar(1 + breathSin * 0.03);
    if (hornRRef.current) hornRRef.current.scale.setScalar(1 + breathSin * 0.03);
    // Antenna sway — modulated by idle appendage speed
    if (antennaLRef.current) {
      antennaLRef.current.rotation.z = -0.3 + Math.sin(t * 1.5 * idleAppSpeed) * 0.15 * activityMult - pn.x * 0.1;
      antennaLRef.current.rotation.x = Math.cos(t * 1.2 * idleAppSpeed) * 0.1 * activityMult + pn.y * 0.05;
    }
    if (antennaRRef.current) {
      antennaRRef.current.rotation.z = 0.3 - Math.sin(t * 1.5 * idleAppSpeed + 0.5) * 0.15 * activityMult - pn.x * 0.1;
      antennaRRef.current.rotation.x = Math.cos(t * 1.2 * idleAppSpeed + 0.3) * 0.1 * activityMult + pn.y * 0.05;
    }
    // Mouth animation — blends mood config with expression system
    if (mouthRef.current) {
      // Expression mouthOpen scales Y (open mouth); vocalization adds extra opening
      const exprMouthOpen = expr.mouthOpen;
      const mouthOpenTarget = 0.3 + (mouthConfig.open + exprMouthOpen) * 0.5 * 0.7 + vocalMouthRef.current * 0.4;
      damp(mouthRef.current.scale, "x", mouthConfig.width, 5.0, dt)
      damp(mouthRef.current.scale, "y", mouthOpenTarget, 5.0, dt)
      // Expression mouthCurve: positive = smile (rotate up), negative = frown (rotate down)
      const exprCurve = expr.mouthCurve;
      const combinedCurve = (mouthConfig.curve + exprCurve) * 0.5;
      damp(mouthRef.current.rotation, "z", combinedCurve * 0.3, 3.7, dt)
      // Flip mouth arc for frown vs smile: rotate X to arc downward when negative
      const arcFlip = combinedCurve < 0 ? Math.PI : 0;
      damp(mouthRef.current.rotation, "x", arcFlip, 3.7, dt)
    }

    // Dream particles — orbit around creature when dreaming/daydreaming
    const dreamOpacity = idleDreamParticlesRef.current;
    for (let di = 0; di < 5; di++) {
      const dp = dreamParticleRefs.current[di];
      if (!dp) continue;
      const orbitPhase = t * 0.4 + di * ((Math.PI * 2) / 5);
      const orbitRadius = 0.55 + di * 0.06;
      dp.position.x = Math.cos(orbitPhase) * orbitRadius;
      dp.position.y = Math.sin(orbitPhase * 0.7 + di) * 0.15 + 0.2;
      dp.position.z = Math.sin(orbitPhase) * orbitRadius;
      (dp.material as THREE.MeshBasicMaterial).opacity = dreamOpacity * (0.3 + Math.sin(t * 1.5 + di * 1.2) * 0.2);
      dp.scale.setScalar(0.02 + Math.sin(t * 2 + di) * 0.008);
    }

    // ── Tear Particles ──────────────────────────────────────────────────
    // Spawn tear drops when mood is sad, crying, or lonely AND emotion
    // intensity exceeds 0.6. Max 6 particles, each fades out over 1.5s.
    const tearMoods = ["sad", "crying", "lonely"];
    const isTearMood = tearMoods.includes(moodLower);
    const emotionIntensity = expr.intensity;
    const tearTarget = (isTearMood && emotionIntensity > 0.6) ? 1 : 0;
    damp(tearActiveRef, "current", tearTarget, 2.5, dt);
    const tearVisibility = tearActiveRef.current;

    const eyeHeight = 0.2 * (1 + morphWeights.bodyStretch * 0.4 + morphWeights.crownGrowth * 0.3);
    const eyeDepth = 0.34 * (1 + morphWeights.bodyBulge * 0.15);

    for (let ti = 0; ti < 6; ti++) {
      const tp = tearParticleRefs.current[ti];
      if (!tp) continue;
      const tearData = tearOffsetsRef.current[ti];

      if (tearVisibility > 0.05) {
        // Fall speed: gravity-like y -= delta * speed
        tearData.y -= dt * (0.3 + ti * 0.05);
        // Track age for 1.5 second fade-out
        tearData.age += dt;
        // Respawn when fallen below creature body or faded out (age > 1.5s)
        if (tearData.y < -0.6 || tearData.age > 1.5) {
          tearData.y = 0;
          tearData.age = 0;
          tearData.phase = t + ti * 0.3;
        }
        // Position: near eye area with slight sideways drift
        const driftX = tearData.drift * Math.sin(t * 0.8 + ti);
        tp.position.x = tearData.x + driftX;
        tp.position.y = eyeHeight + tearData.y;
        tp.position.z = eyeDepth + 0.05;
        // Teardrop scale: slightly elongated vertically while falling
        const fallSpeed = Math.abs(tearData.y) * 0.5;
        tp.scale.set(0.012, 0.012 + fallSpeed * 0.02, 0.012);
        // Opacity: fade out over 1.5 seconds, modulated by tearVisibility
        const spawnFade = Math.min(1, Math.abs(tearData.y) * 5); // fade in near eye
        const ageFade = Math.max(0, 1 - tearData.age / 1.5); // fade out over 1.5s
        (tp.material as THREE.MeshBasicMaterial).opacity = tearVisibility * spawnFade * ageFade * 0.6;
      } else {
        // Hidden — move offscreen
        (tp.material as THREE.MeshBasicMaterial).opacity = 0;
        tearData.y = 0;
        tearData.age = 0;
      }
    }

    // ── Eating Animation (Chomp) ────────────────────────────────────────
    // 3-phase animation over 2 seconds:
    //   Phase 1 (0.0-0.4s): Food particles appear at distance, move toward mouth; mouth opens wide
    //   Phase 2 (0.4-1.6s): 3-4 chewing motions (rhythmic jaw oscillation)
    //   Phase 3 (1.6-2.0s): Satisfied expression (eyes squint, slight growth pulse)
    if (isEating && !eatingActiveRef.current) {
      eatingActiveRef.current = true;
      eatingTimerRef.current = 2.0; // 2 second chomp duration
      // Reset food particles — start offset from mouth for approach trajectory
      for (let fi = 0; fi < 3; fi++) {
        const fv = foodParticleVelocities.current[fi];
        // Spawn positions: scattered in front of the creature
        fv.x = (Math.sin(t + fi * 2.1) - 0.5) * 0.4;
        fv.y = 0.3 + Math.sin(t + fi * 1.7) * 0.2;
        fv.z = 0.3 + Math.cos(t + fi * 3.2) * 0.15;
        fv.life = 1.0;
      }
    }
    if (!isEating) {
      eatingActiveRef.current = false;
    }

    if (eatingTimerRef.current > 0) {
      eatingTimerRef.current -= dt;
      const eatElapsed = 2.0 - eatingTimerRef.current; // 0..2 seconds elapsed

      if (eatElapsed < 0.4) {
        // Phase 1: Mouth opens wide, food approaches
        if (mouthRef.current) {
          const openTarget = 0.8 + eatElapsed * 0.5; // ramp to wide open
          damp(mouthRef.current.scale, "y", openTarget, 10.0, dt)
          damp(mouthRef.current.scale, "x", 1.4, 5.0, dt)
        }
        // Food particles approach mouth from spawn positions
        const approachT = eatElapsed / 0.4; // 0..1 over the approach phase
        for (let fi = 0; fi < 3; fi++) {
          const fp = foodParticleRefs.current[fi];
          if (!fp) continue;
          const fv = foodParticleVelocities.current[fi];
          // Lerp from spawn offset toward mouth center
          fp.position.x = mouthPos[0] + fv.x * (1 - approachT);
          fp.position.y = mouthPos[1] + fv.y * (1 - approachT);
          fp.position.z = mouthPos[2] + 0.1 + fv.z * (1 - approachT);
          fp.scale.setScalar(0.015);
          (fp.material as THREE.MeshBasicMaterial).opacity = Math.min(1, approachT * 2) * 0.8;
        }
      } else if (eatElapsed < 1.6) {
        // Phase 2: Chewing — 3-4 rhythmic jaw oscillations
        if (mouthRef.current) {
          const chewTime = eatElapsed - 0.4; // 0..1.2 seconds of chewing
          const chompPhase = Math.sin(chewTime * Math.PI * 2 * 3); // ~3 chew cycles
          const chompOpen = 0.4 + Math.abs(chompPhase) * 0.5; // 0.4-0.9 range
          damp(mouthRef.current.scale, "y", chompOpen, 10.0, dt)
          damp(mouthRef.current.scale, "x", 1.3, 5.0, dt)
        }
        // Food particles hidden during chewing (already in mouth)
        for (let fi = 0; fi < 3; fi++) {
          const fp = foodParticleRefs.current[fi];
          if (fp) (fp.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      } else {
        // Phase 3: Satisfied expression — mouth closes into smile, eyes squint, growth pulse
        if (mouthRef.current) {
          damp(mouthRef.current.scale, "y", 0.15, 5.0, dt)
          damp(mouthRef.current.scale, "x", 1.0, 3.7, dt)
        }
        // Trigger satisfied pulse — decays in the block below
        eatingSatisfiedRef.current = Math.max(eatingSatisfiedRef.current, 1.0);
        // Hide food particles
        for (let fi = 0; fi < 3; fi++) {
          const fp = foodParticleRefs.current[fi];
          if (fp) (fp.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }
    } else {
      // Hide food particles when not eating
      for (let fi = 0; fi < 3; fi++) {
        const fp = foodParticleRefs.current[fi];
        if (fp) (fp.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    // Post-eating satisfied expression: eyes squint + slight body growth pulse
    if (eatingSatisfiedRef.current > 0.01) {
      eatingSatisfiedRef.current *= Math.exp(-1.83 * dt); // frame-independent decay (0.97/frame@60fps)
      const sat = eatingSatisfiedRef.current;
      // Eye squint: reduce eye openness for content look
      if (eyeGroupLRef.current) eyeGroupLRef.current.scale.y *= (1 - sat * 0.4);
      if (eyeGroupRRef.current) eyeGroupRRef.current.scale.y *= (1 - sat * 0.4);
      // Growth pulse: slight body scale bump
      if (groupRef.current) {
        const pulseSc = 1 + sat * 0.06;
        groupRef.current.scale.multiplyScalar(pulseSc);
      }
    }
  });

  const dynEyeSize = eyeSize;

  const cyclopsEyeSize = dynEyeSize * 1.5;
  const thirdEyeSize = dynEyeSize * 0.7;

  return (
    <group ref={groupRef}>
      {/* Mood aura glow — subtle inner rim only, not a dominant halo ring */}
      <mesh ref={haloRef} scale={1.08}>
        <sphereGeometry args={[0.62, 24, 24]} />
        <meshBasicMaterial color={moodAuraColor} transparent opacity={(moodMod.auraOpacity + appearance.glowIntensity * 0.12) * 0.35} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* ─── RENDERING LOGIC ─────────────────────────────────────────────── */}
      {/* Main body — crystal (rare) or toon material */}
      {isCrystalline ? (
        <mesh ref={meshRef} geometry={geometry} scale={hasStructure ? 0.4 : 1}>
          <meshPhysicalMaterial
            color={primaryColor}
            transmission={VISUAL_CONFIG.crystalTransmission}
            roughness={VISUAL_CONFIG.crystalRoughness}
            metalness={0.1}
            ior={1.5}
            thickness={0.5}
            transparent
          />
          <Outlines thickness={VISUAL_CONFIG.outlineThicknessBody} color="white" />
        </mesh>
      ) : (
        <mesh ref={meshRef} geometry={geometry} scale={hasStructure ? 0.4 : 1}>
          <meshPhysicalMaterial
            ref={meshMatRef}
            onBeforeCompile={handleBeforeCompile}
            customProgramCacheKey={() => "creature-dna-phys-v1"}
            color={primaryColor}
            emissive={primaryColor}
            emissiveIntensity={emissiveIntensity}
            transparent
            opacity={Math.max(0.4, activityDim * 0.9 * Math.max(0.5, vitality ?? 1)) * (hasStructure ? 0.5 : 1)}
            vertexColors={hasVertexColors}
            envMapIntensity={0}
            iridescence={initMatTargets.iridescence}
            iridescenceIOR={initMatTargets.iridescenceIOR}
            iridescenceThicknessRange={[100, initMatTargets.iridescenceThicknessMax] as [number, number]}
            sheen={initMatTargets.sheen}
            sheenRoughness={initMatTargets.sheenRoughness}
            sheenColor={initMatSheenColor}
            transmission={initMatTargets.transmission}
            ior={initMatTargets.ior}
            roughness={initMatTargets.roughness}
            metalness={initMatTargets.metalness}
          />
          <Outlines thickness={VISUAL_CONFIG.outlineThicknessBody} color={VISUAL_CONFIG.outlineColor} />
        </mesh>
      )}

      {/* Continuous body structure — limbs, head, segments, wings, tail, etc. */}
      {hasStructure && (
        <CreatureBodyPlan
          structure={bodyStructure}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          emissiveIntensity={emissiveIntensity}
          activityDim={activityDim}
          vitality={vitality}
          toonGradient={toonGradient}
          archetype={species.archetype}
          visualParams={visualParams}
        />
      )}

      {/* Body segments: extra segment meshes stacked along Y when bodySegments > 1 */}
      {(bodySegmentsConfig.count > 1 || bodySegmentsConfig.fractional > 0.025) && (() => {
        const els: React.ReactElement[] = [];
        // Full segments (si=1 to count-1) at constant opacity
        for (let si = 1; si < bodySegmentsConfig.count; si++) {
          const segScale = 1 - si * 0.12;
          const yOff = -si * 0.22 * bodyElongation;
          const segRadius = blendedGeo.radius * segScale;
          els.push(
            <mesh key={`seg-${si}`} position={[0, yOff, 0]} scale={[segScale, segScale * 0.85, segScale]}>
              <sphereGeometry args={[segRadius, 12, 10]} />
              <meshToonMaterial
                color={si % 2 === 0 ? primaryColor : secondaryColor}
                emissive={si % 2 === 0 ? primaryColor : secondaryColor}
                emissiveIntensity={emissiveIntensity * 0.7}
                transparent
                opacity={0.75 * activityDim * Math.max(0.5, vitality)}
                gradientMap={toonGradient}
              />
            </mesh>,
          );
        }
        // Partial/growing segment — fades in as fractional approaches 1
        if (bodySegmentsConfig.fractional > 0.025) {
          const si = bodySegmentsConfig.count;
          const segScale = 1 - si * 0.12;
          const yOff = -si * 0.22 * bodyElongation;
          const segRadius = blendedGeo.radius * segScale;
          const partialOpacity = 0.75 * Math.min(1, bodySegmentsConfig.fractional * 2);
          if (partialOpacity >= 0.05) {
            els.push(
              <mesh key={`seg-${si}`} position={[0, yOff, 0]} scale={[segScale, segScale * 0.85, segScale]}>
                <sphereGeometry args={[segRadius, 12, 10]} />
                <meshToonMaterial
                  color={si % 2 === 0 ? primaryColor : secondaryColor}
                  emissive={si % 2 === 0 ? primaryColor : secondaryColor}
                  emissiveIntensity={emissiveIntensity * 0.7}
                  transparent
                  opacity={partialOpacity * activityDim * Math.max(0.5, vitality)}
                  gradientMap={toonGradient}
                />
              </mesh>,
            );
          }
        }
        return <>{els}</>;
      })()}

      {/* EYES: 1 (cyclops), 2 (normal), or 3 (third-eye) */}
      {eyeConfig.count >= 2 && (
        <>
          <group ref={eyeGroupLRef} position={eyePositions.left}>
            <mesh>
              <sphereGeometry args={[dynEyeSize, 12, 12]} />
              <meshToonMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={VISUAL_CONFIG.scleraEmissiveIntensity * activityDim} transparent opacity={0.9 * activityDim} gradientMap={toonGradient} />
              <Outlines thickness={VISUAL_CONFIG.outlineThicknessEye} color={VISUAL_CONFIG.outlineColor} />
            </mesh>
            <mesh ref={eyeLRef} position={[0, 0, dynEyeSize * 0.6]}>
              <sphereGeometry args={[dynEyeSize * 0.5, 10, 10]} />
              <meshToonMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={VISUAL_CONFIG.eyeEmissiveIntensity * activityDim} gradientMap={toonGradient} />
            </mesh>
            {/* Specular highlight dot — makes eyes feel alive */}
            <mesh position={[dynEyeSize * 0.18, dynEyeSize * 0.2, dynEyeSize * 0.85]}>
              <sphereGeometry args={[dynEyeSize * 0.15, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Eyelid — expression-driven droop, scaled in useFrame */}
            <mesh ref={eyelidLRef} position={[0, dynEyeSize * 0.4, dynEyeSize * 0.3]} scale={[1, 0.01, 1]}>
              <sphereGeometry args={[dynEyeSize * 0.7, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshToonMaterial color={primaryColor} transparent opacity={0.85} gradientMap={toonGradient} />
            </mesh>
          </group>
          <group ref={eyeGroupRRef} position={eyePositions.right}>
            <mesh>
              <sphereGeometry args={[dynEyeSize, 12, 12]} />
              <meshToonMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={VISUAL_CONFIG.scleraEmissiveIntensity * activityDim} transparent opacity={0.9 * activityDim} gradientMap={toonGradient} />
              <Outlines thickness={VISUAL_CONFIG.outlineThicknessEye} color={VISUAL_CONFIG.outlineColor} />
            </mesh>
            <mesh ref={eyeRRef} position={[0, 0, dynEyeSize * 0.6]}>
              <sphereGeometry args={[dynEyeSize * 0.5, 10, 10]} />
              <meshToonMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={VISUAL_CONFIG.eyeEmissiveIntensity * activityDim} gradientMap={toonGradient} />
            </mesh>
            {/* Specular highlight dot */}
            <mesh position={[dynEyeSize * 0.18, dynEyeSize * 0.2, dynEyeSize * 0.85]}>
              <sphereGeometry args={[dynEyeSize * 0.15, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Eyelid — expression-driven droop, scaled in useFrame */}
            <mesh ref={eyelidRRef} position={[0, dynEyeSize * 0.4, dynEyeSize * 0.3]} scale={[1, 0.01, 1]}>
              <sphereGeometry args={[dynEyeSize * 0.7, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshToonMaterial color={primaryColor} transparent opacity={0.85} gradientMap={toonGradient} />
            </mesh>
          </group>
        </>
      )}
      {eyeConfig.count === 1 && (
        <group ref={eyeGroupLRef} position={[0, eyePositions.left[1], eyePositions.left[2] + 0.02]}>
          <mesh>
            <sphereGeometry args={[cyclopsEyeSize, 12, 12]} />
            <meshToonMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={VISUAL_CONFIG.scleraEmissiveIntensity * activityDim} transparent opacity={0.9 * activityDim} gradientMap={toonGradient} />
            <Outlines thickness={VISUAL_CONFIG.outlineThicknessEye} color={VISUAL_CONFIG.outlineColor} />
          </mesh>
          <mesh ref={eyeLRef} position={[0, 0, cyclopsEyeSize * 0.6]}>
            <sphereGeometry args={[cyclopsEyeSize * 0.5, 10, 10]} />
            <meshToonMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={VISUAL_CONFIG.eyeEmissiveIntensity * activityDim} gradientMap={toonGradient} />
          </mesh>
          {/* Specular highlight dot */}
          <mesh position={[cyclopsEyeSize * 0.18, cyclopsEyeSize * 0.2, cyclopsEyeSize * 0.85]}>
            <sphereGeometry args={[cyclopsEyeSize * 0.15, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Eyelid — expression-driven droop, scaled in useFrame */}
          <mesh ref={eyelidCyclopsRef} position={[0, cyclopsEyeSize * 0.4, cyclopsEyeSize * 0.3]} scale={[1, 0.01, 1]}>
            <sphereGeometry args={[cyclopsEyeSize * 0.7, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshToonMaterial color={primaryColor} transparent opacity={0.85} gradientMap={toonGradient} />
          </mesh>
        </group>
      )}
      {/* Third eye: continuous opacity (e.g. 2.3 eyes → third eye at 30% opacity) */}
      {eyeConfig.count >= 2 && eyeConfig.thirdEyeOpacity > 0.05 && (
        <group position={eyePositions.center}>
          <mesh>
            <sphereGeometry args={[thirdEyeSize, 10, 10]} />
            <meshToonMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={VISUAL_CONFIG.scleraEmissiveIntensity * activityDim} transparent opacity={eyeConfig.thirdEyeOpacity * 0.8 * activityDim} gradientMap={toonGradient} />
            <Outlines thickness={VISUAL_CONFIG.outlineThicknessEye} color={VISUAL_CONFIG.outlineColor} />
          </mesh>
          <mesh position={[0, 0, thirdEyeSize * 0.6]}>
            <sphereGeometry args={[thirdEyeSize * 0.5, 8, 8]} />
            <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={VISUAL_CONFIG.eyeEmissiveIntensity * activityDim} transparent opacity={eyeConfig.thirdEyeOpacity * activityDim} gradientMap={toonGradient} />
          </mesh>
        </group>
      )}

      {/* MOUTH: mood-driven expression — enlarged for visibility */}
      <mesh ref={mouthRef} position={mouthPos}>
        <torusGeometry args={[0.055, 0.012, 8, 16, Math.PI]} />
        <meshToonMaterial color={_MOUTH_COLOR} emissive={_MOUTH_EMISSIVE} emissiveIntensity={0.3} gradientMap={toonGradient} />
      </mesh>

      {/* HORNS: continuous presence — gated by appendageVariety (threshold 0.8) */}
      {appendageConfig.hasHorns && varietyThreshold < 0.8 && (() => {
        const hp = appendageConfig.hornPresence;
        const hornH = (0.12 + dna.intensity * 0.1) * hp;
        const hornR = (0.03 + dna.assertiveness * 0.02) * (0.5 + hp * 0.5);
        const yBase = (0.38 + morphWeights.crownGrowth * 0.15) * bodyElongation;
        const hornSpread = 0.12 + dna.independence * 0.06;
        return (
          <>
            <mesh ref={hornLRef} position={[-hornSpread, yBase, 0]} rotation={[0, 0, 0.25 + appendageConfig.hornCurve]}>
              <coneGeometry args={[hornR, hornH, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.9} transparent opacity={hp * activityDim} gradientMap={toonGradient} />
            </mesh>
            <mesh ref={hornRRef} position={[hornSpread, yBase, 0]} rotation={[0, 0, -0.25 - appendageConfig.hornCurve]}>
              <coneGeometry args={[hornR, hornH, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.9} transparent opacity={hp * activityDim} gradientMap={toonGradient} />
            </mesh>
          </>
        );
      })()}

      {/* ANTENNAE: continuous presence — gated by appendageVariety (threshold 0.7) */}
      {appendageConfig.hasAntennae && varietyThreshold < 0.7 && (() => {
        const ap = appendageConfig.antennaPresence;
        const antLen = appendageConfig.antennaLength * (0.5 + ap * 0.5);
        const yBase = (0.4 + morphWeights.crownGrowth * 0.12) * bodyElongation;
        return (
          <>
            <mesh ref={antennaLRef} position={[-0.08, yBase, 0.05]}>
              <capsuleGeometry args={[0.01, antLen, 4, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.7} transparent opacity={ap * 0.75 * activityDim} gradientMap={toonGradient} />
              <mesh position={[0, antLen * 0.5 + 0.02, 0]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshToonMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1.2 * activityDim} gradientMap={toonGradient} />
              </mesh>
            </mesh>
            <mesh ref={antennaRRef} position={[0.08, yBase, 0.05]}>
              <capsuleGeometry args={[0.01, antLen, 4, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.7} transparent opacity={ap * 0.75 * activityDim} gradientMap={toonGradient} />
              <mesh position={[0, antLen * 0.5 + 0.02, 0]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshToonMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1.2 * activityDim} gradientMap={toonGradient} />
              </mesh>
            </mesh>
          </>
        );
      })()}

      {/* TAIL: continuous presence */}
      {appendageConfig.hasTail && (() => {
        const tp = appendageConfig.tailPresence;
        const yBase = (-0.25 - morphWeights.veilDrape * 0.1) * bodyElongation;
        return (
          <mesh ref={tailRef} position={[0, yBase, -0.3]}>
            <capsuleGeometry args={[0.025 * (0.5 + tp * 0.5), appendageConfig.tailLength * tp, 4, 8]} />
            <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.7} transparent opacity={tp * 0.65 * activityDim} gradientMap={toonGradient} />
          </mesh>
        );
      })()}

      {/* FIN-WINGS: continuous presence — gated by appendageVariety (threshold 0.6) */}
      {appendageConfig.hasFinWings && varietyThreshold < 0.6 && (() => {
        const fp = appendageConfig.finWingPresence;
        const finH = (0.12 + dna.adaptability * 0.1) * fp;
        const xOff = 0.36 + morphWeights.sideSpread * 0.08;
        return (
          <>
            <mesh position={[-xOff, 0.05, -0.05]} rotation={[0.1, 0.3, 0.6]}>
              <planeGeometry args={[0.08 * fp, finH]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.5} transparent opacity={fp * 0.4 * activityDim} side={THREE.DoubleSide} gradientMap={toonGradient} />
            </mesh>
            <mesh position={[xOff, 0.05, -0.05]} rotation={[0.1, -0.3, -0.6]}>
              <planeGeometry args={[0.08 * fp, finH]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.5} transparent opacity={fp * 0.4 * activityDim} side={THREE.DoubleSide} gradientMap={toonGradient} />
            </mesh>
          </>
        );
      })()}

      {/* EAR BUMPS: continuous presence — gated by appendageVariety (threshold 0.5) */}
      {appendageConfig.hasEarBumps && varietyThreshold < 0.5 && (() => {
        const ep = appendageConfig.earBumpPresence;
        const earSz = (0.04 + dna.empathy * 0.03) * (0.5 + ep * 0.5);
        const yBase = (0.28 + morphWeights.bodyStretch * 0.1) * bodyElongation;
        const xOff = 0.28 + morphWeights.sideSpread * 0.08;
        return (
          <>
            <mesh position={[-xOff, yBase, 0.08]} rotation={[0, 0, 0.4]}>
              <sphereGeometry args={[earSz, 8, 6]} />
              <meshToonMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={emissiveIntensity * 0.6} transparent opacity={ep * 0.7 * activityDim} gradientMap={toonGradient} />
            </mesh>
            <mesh position={[xOff, yBase, 0.08]} rotation={[0, 0, -0.4]}>
              <sphereGeometry args={[earSz, 8, 6]} />
              <meshToonMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={emissiveIntensity * 0.6} transparent opacity={ep * 0.7 * activityDim} gradientMap={toonGradient} />
            </mesh>
          </>
        );
      })()}

      {/* SPIKES: continuous presence — gated by appendageVariety (threshold 0.65) */}
      {appendageConfig.hasSpikes && varietyThreshold < 0.65 && (() => {
        const sp = appendageConfig.spikePresence;
        const els: React.ReactElement[] = [];
        const count = appendageConfig.spikeCount;
        for (let si = 0; si < count; si++) {
          const angle = (si / count) * Math.PI * 2;
          const yOff = (seededRandom(appearance.markingsSeed, si + 100) - 0.5) * 0.3;
          const sLen = (0.06 + seededRandom(appearance.markingsSeed, si + 200) * 0.08) * sp;
          const sRad = (0.015 + dna.intensity * 0.01) * (0.5 + sp * 0.5);
          els.push(
            <mesh key={`spike-${si}`} position={[Math.cos(angle) * 0.38, yOff * bodyElongation, Math.sin(angle) * 0.38]} rotation={[0, -angle, Math.PI / 2 - 0.2]}>
              <coneGeometry args={[sRad, sLen, 4]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.6} transparent opacity={sp * 0.6 * activityDim} gradientMap={toonGradient} />
            </mesh>,
          );
        }
        return <>{els}</>;
      })()}

      {/* Crown appendage: high-creativity */}
      {morphWeights.crownGrowth > 0.3 && (
        <mesh ref={crownRef} position={[0, (0.42 + morphWeights.crownGrowth * 0.2) * bodyElongation, 0]}>
          <coneGeometry args={[0.06 + morphWeights.crownGrowth * 0.04, 0.15 + morphWeights.crownGrowth * 0.2, 5]} />
          <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 1.2} transparent opacity={0.7 * activityDim} gradientMap={toonGradient} />
        </mesh>
      )}

      {/* Side appendages: limb count from continuous morphology */}
      {conMorph.limbCount > 0.5 && (() => {
        const limbPairs = Math.max(1, Math.round(conMorph.limbCount / 2));
        const limbPresence = Math.min(1, conMorph.limbCount / 2); // 0..1 opacity
        const limbElements: React.ReactElement[] = [];
        for (let li = 0; li < limbPairs; li++) {
          const yOff = limbPairs === 1 ? 0 : (li - (limbPairs - 1) / 2) * 0.14;
          const sizeScale = 1 - li * 0.15;
          const xOffset = 0.38 + morphWeights.sideSpread * 0.1;
          const limbSize = (0.08 + morphWeights.sideSpread * 0.05) * sizeScale;
          const rotVariance = asymmetryFactor > 0.01 ? (li % 2 === 1 ? 0.15 : 0) : 0;
          const limbColor = li % 2 === 0 ? primaryColor : secondaryColor;
          limbElements.push(
            <mesh key={`sl-${li}`} ref={li === 0 ? sideLeftRef : undefined} position={[-xOffset, yOff, 0]} rotation={[rotVariance, 0, 0.4]}>
              <sphereGeometry args={[limbSize, 8, 8]} />
              <meshToonMaterial color={limbColor} emissive={limbColor} emissiveIntensity={emissiveIntensity * 0.8} transparent opacity={limbPresence * 0.85 * activityDim} gradientMap={toonGradient} />
            </mesh>,
            <mesh key={`sr-${li}`} ref={li === 0 ? sideRightRef : undefined} position={[xOffset, yOff, 0]} rotation={[-rotVariance, 0, -0.4]}>
              <sphereGeometry args={[limbSize, 8, 8]} />
              <meshToonMaterial color={limbColor} emissive={limbColor} emissiveIntensity={emissiveIntensity * 0.8} transparent opacity={limbPresence * 0.85 * activityDim} gradientMap={toonGradient} />
            </mesh>,
          );
        }
        return <>{limbElements}</>;
      })()}

      {/* Veil drape tendrils: 3-6, alternating primary/secondary */}
      {morphWeights.veilDrape > 0.3 && (() => {
        const tendrilCount = Math.max(3, Math.min(6, Math.round(3 + dna.openness * 1.5 + dna.empathy)));
        return (
          <>
            {Array.from({ length: tendrilCount }, (_, i) => {
              const angle = (i / tendrilCount) * Math.PI * 2;
              const drapLen = 0.15 + morphWeights.veilDrape * 0.2;
              const lenVariance = asymmetryFactor > 0.01 ? 1 + (i % 2 === 0 ? 0.15 : -0.1) : 1;
              const tendrilColor = i % 2 === 0 ? primaryColor : secondaryColor;
              return (
                <mesh
                  key={i}
                  ref={i < 3 ? (el) => { veilRefs.current[i] = el; } : undefined}
                  position={[Math.cos(angle) * 0.15, (-0.35 - morphWeights.veilDrape * 0.15) * bodyElongation, Math.sin(angle) * 0.15]}
                >
                  <capsuleGeometry args={[0.02, drapLen * lenVariance, 4, 6]} />
                  <meshToonMaterial color={tendrilColor} emissive={tendrilColor} emissiveIntensity={emissiveIntensity * 0.6} transparent opacity={0.4 * activityDim} gradientMap={toonGradient} />
                </mesh>
              );
            })}
          </>
        );
      })()}

      {/* Dream particles — 5 small glowing orbs that orbit when dreaming/daydreaming */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={`dream-${i}`}
          ref={(el) => { dreamParticleRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshBasicMaterial color={secondaryColor} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* Tear particles — 6 small blue translucent spheres falling from eye area */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={`tear-${i}`}
          ref={(el) => { tearParticleRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial
            color={_TEAR_COLOR}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Food particles — 3 small bits that fly from mouth during eating */}
      {Array.from({ length: 3 }, (_, i) => (
        <mesh
          key={`food-${i}`}
          ref={(el) => { foodParticleRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.015, 4, 4]} />
          <meshBasicMaterial
            color={_FOOD_COLOR}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Rarity particles — expressed/mastered traits emit glowing upward particles */}
      {rarityInfo.active && (
        <RarityParticles color={rarityInfo.color} intense={rarityInfo.intense} />
      )}
    </group>
  );
});
