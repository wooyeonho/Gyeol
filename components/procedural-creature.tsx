"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CreatureDNA } from "@/lib/genome/dna";
import type { SpeciesProfile } from "@/lib/genome/species";
import { deriveMorphWeights, computeVertexDisplacements } from "@/lib/genome/morph";
import { deriveDNAAppearance } from "@/lib/genome/appearance";
import type { CreatureActivity } from "@/hooks/use-creature-state";

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

/**
 * A fully procedural creature mesh driven entirely by DNA.
 *
 * Visual diversity features:
 * 1. Dual-tone coloring (primary body + secondary accent on appendages)
 * 2. DNA-driven eye variety (1-3 eyes, variable width ratios, sizes)
 * 3. Expanded appendage library (horns, antennae, tail, fins, ears, spikes)
 * 4. Surface pattern system (spots, stripes, gradient via vertex coloring)
 * 5. Emotional mouth expressions (mood-driven curve, openness, width)
 * 6. Wide silhouette range (0.5-1.7 body elongation)
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
}: ProceduralCreatureProps) {
  const energy = conversationEnergy ?? 0;

  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
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

  const appearance = useMemo(
    () => deriveDNAAppearance(dna, species),
    [dna, species],
  );
  const morphWeights = useMemo(
    () => deriveMorphWeights(dna, species),
    [dna, species],
  );

  // [UPGRADE 6] Wider silhouette range: 0.5-1.7 (was 0.7-1.4)
  const bodyElongation = useMemo(
    () => 0.5 + appearance.bodyRatio * 1.2,
    [appearance.bodyRatio],
  );
  const asymmetryFactor = useMemo(
    () => Math.max(0, 1 - appearance.bodySymmetry) * 0.15,
    [appearance.bodySymmetry],
  );

  // [UPGRADE 2] DNA-driven eye variety
  const eyeConfig = useMemo(() => {
    const isCyclops =
      dna.intuitive > 0.72 && dna.independence > 0.6 && dna.empathy < 0.4;
    const hasThirdEye =
      dna.intuitive > 0.6 && dna.curiosity > 0.6 && !isCyclops;
    const count = isCyclops ? 1 : hasThirdEye ? 3 : 2;
    const widthRatio =
      dna.empathy > 0.6
        ? 1.2 + (dna.empathy - 0.6) * 0.5
        : dna.analytical > 0.6
          ? 0.6 + (0.8 - dna.analytical) * 0.4
          : 1.0;
    const sizeMultiplier = 0.8 + dna.warmth * 0.25 + dna.openness * 0.15;
    return { count, widthRatio, sizeMultiplier };
  }, [dna]);

  // [UPGRADE 3] Expanded appendage library
  const appendageConfig = useMemo(
    () => ({
      hasHorns: dna.intensity > 0.55 && dna.assertiveness > 0.45,
      hasAntennae: dna.curiosity > 0.58 && dna.intuitive > 0.4,
      hasTail: dna.playfulness > 0.5,
      hasFinWings: dna.adaptability > 0.58 && dna.openness > 0.45,
      hasEarBumps: dna.empathy > 0.58 && dna.warmth > 0.48,
      hasSpikes: dna.assertiveness > 0.62 && dna.intensity > 0.55,
      hornCurve: dna.creativity > 0.5 ? 0.3 : 0,
      tailLength: 0.15 + dna.playfulness * 0.2,
      antennaLength: 0.12 + dna.curiosity * 0.18,
      spikeCount: Math.max(4, Math.min(8, Math.round(4 + dna.assertiveness * 4))),
    }),
    [dna],
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

  // [UPGRADE 4] Geometry with surface pattern vertex colors
  const geometry = useMemo(() => {
    const base = createArchetypeGeometry(species.archetype, 0.42);
    const positions = base.attributes.position.array as Float32Array;

    const displacements = computeVertexDisplacements(positions, morphWeights);
    const morphed = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const px = positions[i] + displacements[i];
      const py = positions[i + 1] + displacements[i + 1];
      const pz = positions[i + 2] + displacements[i + 2];

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
  }, [morphWeights, species.archetype, bodyElongation, asymmetryFactor, appearance.markingsSeed]);

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
    const spread = eyeConfig.count === 1 ? 0 : 0.14 * (1 + morphWeights.sideSpread * 0.3);
    const height = 0.18 * (1 + morphWeights.bodyStretch * 0.4 + morphWeights.crownGrowth * 0.3);
    const depth = 0.32 * (1 + morphWeights.bodyBulge * 0.15);
    return {
      left: [-spread, height, depth] as [number, number, number],
      right: [spread, height, depth] as [number, number, number],
      center: [0, height + 0.1, depth * 0.9] as [number, number, number],
    };
  }, [morphWeights, eyeConfig.count]);

  const eyeSize = 0.055 * (1 + morphWeights.bodyBulge * 0.2) * eyeConfig.sizeMultiplier;

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

  const activityDim = creatureActivity === "sleeping" ? 0.45 : creatureActivity === "drowsy" ? 0.7 : 1;
  const emissiveIntensity = Math.max(0.1, (appearance.glowIntensity * 0.45 + moodMod.emissiveBoost) * activityDim);

  const hasVertexColors = useMemo(
    () => derivePatternType(appearance.markingsSeed).type !== "none",
    [appearance.markingsSeed],
  );

  const toonGradient = useMemo(() => {
    const colors = new Uint8Array([40, 80, 140, 200, 255]);
    const tex = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;
    const dt = state.clock.getDelta();
    const activityMult = creatureActivity === "sleeping" ? 0.3 : creatureActivity === "drowsy" ? 0.6 : 1;

    const leanTarget = isListening ? 0.12 : 0;
    listeningLeanRef.current += (leanTarget - listeningLeanRef.current) * 0.06;
    const eyeScaleTarget = isListening ? 1.25 : 1;
    eyeScaleRef.current += (eyeScaleTarget - eyeScaleRef.current) * 0.08;

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
    const eyeOpenY = (1 - blinkPhaseRef.current) * moodMod.eyeSquint;

    lookTimerRef.current -= dt;
    if (lookTimerRef.current <= 0 && !lookActiveRef.current && creatureActivity === "awake") {
      lookActiveRef.current = true;
      lookReturnTimerRef.current = 1.2 + Math.random() * 1.6;
      lookTargetRef.current = { x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 0.5 };
    }
    if (lookActiveRef.current) {
      lookCurrentRef.current.x = THREE.MathUtils.lerp(lookCurrentRef.current.x, lookTargetRef.current.x, 0.04);
      lookCurrentRef.current.y = THREE.MathUtils.lerp(lookCurrentRef.current.y, lookTargetRef.current.y, 0.04);
      lookReturnTimerRef.current -= dt;
      if (lookReturnTimerRef.current <= 0) {
        lookActiveRef.current = false;
        lookTimerRef.current = 5 + Math.random() * 8;
        lookTargetRef.current = { x: 0, y: 0 };
      }
    } else {
      lookCurrentRef.current.x = THREE.MathUtils.lerp(lookCurrentRef.current.x, 0, 0.06);
      lookCurrentRef.current.y = THREE.MathUtils.lerp(lookCurrentRef.current.y, 0, 0.06);
    }

    const energyMult = 1 + energy * 0.5;
    const breathSin = Math.sin(breathPhase * Math.PI * 2 * moodMod.speedMult * energyMult);
    const heartbeat = Math.pow(Math.max(0, Math.sin(breathPhase * Math.PI * 4)), 3) * (0.03 + energy * 0.04);
    const breathScale = 1 + breathSin * appearance.breatheDepth * energyMult + heartbeat + excitePulse * 0.12;
    const sc = scale * appearance.scale * breathScale;
    groupRef.current.scale.lerp(new THREE.Vector3(sc, sc, sc), 0.08);

    const rotSpeed = appearance.idleRotation * activityMult * moodMod.speedMult * energyMult;
    groupRef.current.rotation.y += rotSpeed * 0.01;
    groupRef.current.rotation.x = Math.sin(t * 0.3 * activityMult) * 0.05 + moodMod.tiltBias;
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, listeningLeanRef.current, 0.06);

    if (meshRef.current) {
      const squashTarget = moodMod.bodySquash * (excitePulse > 0.1 ? 1 - excitePulse * 0.15 : 1);
      const stretchTarget = moodMod.bodyStretch * (excitePulse > 0.1 ? 1 + excitePulse * 0.12 : 1);
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, squashTarget, 0.06);
      meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, squashTarget, 0.06);
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, stretchTarget, 0.06);
    }

    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      if (positions && (positions as THREE.BufferAttribute & { _basePositions?: Float32Array })._basePositions) {
        const base = (positions as THREE.BufferAttribute & { _basePositions: Float32Array })._basePositions;
        const arr = positions.array as Float32Array;
        const waveAmp = 0.008 * activityMult * moodMod.speedMult * energyMult;
        for (let i = 0; i < arr.length; i += 3) {
          const bx = base[i], by = base[i + 1], bz = base[i + 2];
          const wave = Math.sin(bx * 8 + t * 2) * Math.cos(by * 6 + t * 1.5) * waveAmp;
          arr[i] = bx + bx * wave;
          arr[i + 1] = by + by * wave;
          arr[i + 2] = bz + bz * wave;
        }
        positions.needsUpdate = true;
      }
    }

    if (haloRef.current) {
      const haloPulse = 1 + Math.sin(t * 0.8 * energyMult) * 0.05 + excitePulse * 0.1 + energy * 0.08;
      haloRef.current.scale.setScalar(haloPulse);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity =
        (moodMod.auraOpacity + appearance.glowIntensity * 0.12 + moodMod.emissiveBoost * 0.04 + energy * 0.06) * activityDim;
    }

    const rawPn = creatureActivity === "sleeping" ? { x: 0, y: 0 } : (pointerNorm ?? { x: 0, y: 0 });
    const pn = { x: rawPn.x + lookCurrentRef.current.x, y: rawPn.y + lookCurrentRef.current.y };
    for (const eyeRef of [eyeLRef, eyeRRef]) {
      if (eyeRef.current) {
        eyeRef.current.position.x = THREE.MathUtils.lerp(eyeRef.current.position.x, pn.x * eyeSize * 0.3, 0.08);
        eyeRef.current.position.y = THREE.MathUtils.lerp(eyeRef.current.position.y, -pn.y * eyeSize * 0.3, 0.08);
      }
    }

    const es = eyeScaleRef.current;
    const ps = moodMod.pupilScale;
    const wr = eyeConfig.widthRatio;
    if (eyeGroupLRef.current) eyeGroupLRef.current.scale.set(es, es * eyeOpenY * wr, es * ps);
    if (eyeGroupRRef.current) eyeGroupRRef.current.scale.set(es, es * eyeOpenY * wr, es * ps);

    // Crown sway
    if (crownRef.current) {
      const windPhase = t * 1.2 + 0.5;
      crownRef.current.rotation.x = Math.sin(windPhase) * 0.12 * activityMult + breathSin * 0.06;
      crownRef.current.rotation.z = Math.cos(windPhase * 0.7) * 0.08 * activityMult;
      crownRef.current.scale.setScalar(1 + breathSin * 0.05);
    }
    if (sideLeftRef.current) {
      const flapPhase = t * 0.8;
      sideLeftRef.current.rotation.z = 0.4 + Math.sin(flapPhase) * 0.15 * activityMult + breathSin * 0.08;
      sideLeftRef.current.position.y = Math.sin(flapPhase * 1.3) * 0.02 * activityMult;
    }
    if (sideRightRef.current) {
      const flapPhase = t * 0.8 + Math.PI * 0.3;
      sideRightRef.current.rotation.z = -0.4 - Math.sin(flapPhase) * 0.15 * activityMult - breathSin * 0.08;
      sideRightRef.current.position.y = Math.sin(flapPhase * 1.3) * 0.02 * activityMult;
    }
    for (let vi = 0; vi < 3; vi++) {
      const veilMesh = veilRefs.current[vi];
      if (!veilMesh) continue;
      const phase = t * 0.6 + vi * ((Math.PI * 2) / 3);
      veilMesh.rotation.x = Math.sin(phase) * 0.2 * activityMult + breathSin * 0.1;
      veilMesh.rotation.z = Math.cos(phase * 0.8 + 0.5) * 0.15 * activityMult;
      veilMesh.scale.y = 1 + breathSin * 0.04;
    }

    // Tail wag
    if (tailRef.current) {
      const wagSpeed = 1.5 + dna.playfulness * 1.5;
      const wagAmp = 0.2 + dna.playfulness * 0.3;
      tailRef.current.rotation.x = Math.sin(t * wagSpeed) * wagAmp * activityMult;
      tailRef.current.rotation.y = Math.cos(t * wagSpeed * 0.7) * wagAmp * 0.5 * activityMult;
      tailRef.current.scale.y = 1 + breathSin * 0.03;
    }
    // Horn pulse
    if (hornLRef.current) hornLRef.current.scale.setScalar(1 + breathSin * 0.03);
    if (hornRRef.current) hornRRef.current.scale.setScalar(1 + breathSin * 0.03);
    // Antenna sway
    if (antennaLRef.current) {
      antennaLRef.current.rotation.z = -0.3 + Math.sin(t * 1.5) * 0.15 * activityMult - pn.x * 0.1;
      antennaLRef.current.rotation.x = Math.cos(t * 1.2) * 0.1 * activityMult + pn.y * 0.05;
    }
    if (antennaRRef.current) {
      antennaRRef.current.rotation.z = 0.3 - Math.sin(t * 1.5 + 0.5) * 0.15 * activityMult - pn.x * 0.1;
      antennaRRef.current.rotation.x = Math.cos(t * 1.2 + 0.3) * 0.1 * activityMult + pn.y * 0.05;
    }
    // Mouth animation
    if (mouthRef.current) {
      mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, mouthConfig.width, 0.08);
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, 0.3 + mouthConfig.open * 0.7, 0.08);
      mouthRef.current.rotation.z = THREE.MathUtils.lerp(mouthRef.current.rotation.z, mouthConfig.curve * 0.3, 0.06);
    }
  });

  const dynEyeSize = eyeSize;

  const mouthPos = useMemo((): [number, number, number] => {
    const height = 0.04 * (1 + morphWeights.bodyStretch * 0.3);
    const depth = 0.36 * (1 + morphWeights.bodyBulge * 0.12);
    return [0, height, depth];
  }, [morphWeights]);

  const cyclopsEyeSize = dynEyeSize * 1.5;
  const thirdEyeSize = dynEyeSize * 0.7;

  return (
    <group ref={groupRef}>
      {/* Mood aura glow */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.62, 24, 24]} />
        <meshBasicMaterial color={moodAuraColor} transparent opacity={moodMod.auraOpacity + appearance.glowIntensity * 0.12} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* Main body with toon shading + vertex color patterns */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshToonMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={Math.max(0.4, activityDim * 0.9 * Math.max(0.5, vitality))}
          gradientMap={toonGradient}
          vertexColors={hasVertexColors}
        />
      </mesh>

      {/* EYES: 1 (cyclops), 2 (normal), or 3 (third-eye) */}
      {eyeConfig.count >= 2 && (
        <>
          <group ref={eyeGroupLRef} position={eyePositions.left}>
            <mesh>
              <sphereGeometry args={[dynEyeSize, 12, 12]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5 * activityDim} transparent opacity={0.85 * activityDim} />
            </mesh>
            <mesh ref={eyeLRef} position={[0, 0, dynEyeSize * 0.6]}>
              <sphereGeometry args={[dynEyeSize * 0.45, 10, 10]} />
              <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.6 * activityDim} />
            </mesh>
          </group>
          <group ref={eyeGroupRRef} position={eyePositions.right}>
            <mesh>
              <sphereGeometry args={[dynEyeSize, 12, 12]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5 * activityDim} transparent opacity={0.85 * activityDim} />
            </mesh>
            <mesh ref={eyeRRef} position={[0, 0, dynEyeSize * 0.6]}>
              <sphereGeometry args={[dynEyeSize * 0.45, 10, 10]} />
              <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.6 * activityDim} />
            </mesh>
          </group>
        </>
      )}
      {eyeConfig.count === 1 && (
        <group ref={eyeGroupLRef} position={[0, eyePositions.left[1], eyePositions.left[2] + 0.02]}>
          <mesh>
            <sphereGeometry args={[cyclopsEyeSize, 12, 12]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5 * activityDim} transparent opacity={0.85 * activityDim} />
          </mesh>
          <mesh ref={eyeLRef} position={[0, 0, cyclopsEyeSize * 0.6]}>
            <sphereGeometry args={[cyclopsEyeSize * 0.45, 10, 10]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.6 * activityDim} />
          </mesh>
        </group>
      )}
      {eyeConfig.count === 3 && (
        <group position={eyePositions.center}>
          <mesh>
            <sphereGeometry args={[thirdEyeSize, 10, 10]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6 * activityDim} transparent opacity={0.8 * activityDim} />
          </mesh>
          <mesh position={[0, 0, thirdEyeSize * 0.6]}>
            <sphereGeometry args={[thirdEyeSize * 0.5, 8, 8]} />
            <meshStandardMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={0.8 * activityDim} />
          </mesh>
        </group>
      )}

      {/* MOUTH: mood-driven expression */}
      <mesh ref={mouthRef} position={mouthPos}>
        <torusGeometry args={[0.035, 0.008, 8, 12, Math.PI]} />
        <meshToonMaterial color={new THREE.Color(0x221111)} emissive={new THREE.Color(0x110808)} emissiveIntensity={0.3} gradientMap={toonGradient} />
      </mesh>

      {/* HORNS: intensity + assertiveness */}
      {appendageConfig.hasHorns && (() => {
        const hornH = 0.12 + dna.intensity * 0.1;
        const hornR = 0.03 + dna.assertiveness * 0.02;
        const yBase = (0.38 + morphWeights.crownGrowth * 0.15) * bodyElongation;
        const hornSpread = 0.12 + dna.independence * 0.06;
        return (
          <>
            <mesh ref={hornLRef} position={[-hornSpread, yBase, 0]} rotation={[0, 0, 0.25 + appendageConfig.hornCurve]}>
              <coneGeometry args={[hornR, hornH, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.9} gradientMap={toonGradient} />
            </mesh>
            <mesh ref={hornRRef} position={[hornSpread, yBase, 0]} rotation={[0, 0, -0.25 - appendageConfig.hornCurve]}>
              <coneGeometry args={[hornR, hornH, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.9} gradientMap={toonGradient} />
            </mesh>
          </>
        );
      })()}

      {/* ANTENNAE: curiosity + intuitive, glowing bulb tips */}
      {appendageConfig.hasAntennae && (() => {
        const antLen = appendageConfig.antennaLength;
        const yBase = (0.4 + morphWeights.crownGrowth * 0.12) * bodyElongation;
        return (
          <>
            <mesh ref={antennaLRef} position={[-0.08, yBase, 0.05]}>
              <capsuleGeometry args={[0.01, antLen, 4, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.7} transparent opacity={0.75 * activityDim} gradientMap={toonGradient} />
              <mesh position={[0, antLen * 0.5 + 0.02, 0]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1.2 * activityDim} />
              </mesh>
            </mesh>
            <mesh ref={antennaRRef} position={[0.08, yBase, 0.05]}>
              <capsuleGeometry args={[0.01, antLen, 4, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.7} transparent opacity={0.75 * activityDim} gradientMap={toonGradient} />
              <mesh position={[0, antLen * 0.5 + 0.02, 0]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1.2 * activityDim} />
              </mesh>
            </mesh>
          </>
        );
      })()}

      {/* TAIL: playfulness */}
      {appendageConfig.hasTail && (() => {
        const yBase = (-0.25 - morphWeights.veilDrape * 0.1) * bodyElongation;
        return (
          <mesh ref={tailRef} position={[0, yBase, -0.3]}>
            <capsuleGeometry args={[0.025, appendageConfig.tailLength, 4, 8]} />
            <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.7} transparent opacity={0.65 * activityDim} gradientMap={toonGradient} />
          </mesh>
        );
      })()}

      {/* FIN-WINGS: adaptability + openness */}
      {appendageConfig.hasFinWings && (() => {
        const finH = 0.12 + dna.adaptability * 0.1;
        const xOff = 0.36 + morphWeights.sideSpread * 0.08;
        return (
          <>
            <mesh position={[-xOff, 0.05, -0.05]} rotation={[0.1, 0.3, 0.6]}>
              <planeGeometry args={[0.08, finH]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.5} transparent opacity={0.4 * activityDim} side={THREE.DoubleSide} gradientMap={toonGradient} />
            </mesh>
            <mesh position={[xOff, 0.05, -0.05]} rotation={[0.1, -0.3, -0.6]}>
              <planeGeometry args={[0.08, finH]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.5} transparent opacity={0.4 * activityDim} side={THREE.DoubleSide} gradientMap={toonGradient} />
            </mesh>
          </>
        );
      })()}

      {/* EAR BUMPS: empathy + warmth */}
      {appendageConfig.hasEarBumps && (() => {
        const earSz = 0.04 + dna.empathy * 0.03;
        const yBase = (0.28 + morphWeights.bodyStretch * 0.1) * bodyElongation;
        const xOff = 0.28 + morphWeights.sideSpread * 0.08;
        return (
          <>
            <mesh position={[-xOff, yBase, 0.08]} rotation={[0, 0, 0.4]}>
              <sphereGeometry args={[earSz, 8, 6]} />
              <meshToonMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={emissiveIntensity * 0.6} transparent opacity={0.7 * activityDim} gradientMap={toonGradient} />
            </mesh>
            <mesh position={[xOff, yBase, 0.08]} rotation={[0, 0, -0.4]}>
              <sphereGeometry args={[earSz, 8, 6]} />
              <meshToonMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={emissiveIntensity * 0.6} transparent opacity={0.7 * activityDim} gradientMap={toonGradient} />
            </mesh>
          </>
        );
      })()}

      {/* SPIKES: assertiveness + intensity */}
      {appendageConfig.hasSpikes && (() => {
        const els: React.ReactElement[] = [];
        const count = appendageConfig.spikeCount;
        for (let si = 0; si < count; si++) {
          const angle = (si / count) * Math.PI * 2;
          const yOff = (seededRandom(appearance.markingsSeed, si + 100) - 0.5) * 0.3;
          const sLen = 0.06 + seededRandom(appearance.markingsSeed, si + 200) * 0.08;
          const sRad = 0.015 + dna.intensity * 0.01;
          els.push(
            <mesh key={`spike-${si}`} position={[Math.cos(angle) * 0.38, yOff * bodyElongation, Math.sin(angle) * 0.38]} rotation={[0, -angle, Math.PI / 2 - 0.2]}>
              <coneGeometry args={[sRad, sLen, 4]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={emissiveIntensity * 0.6} transparent opacity={0.6 * activityDim} gradientMap={toonGradient} />
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

      {/* Side appendages: 2-6 limbs, alternating primary/secondary */}
      {morphWeights.sideSpread > 0.35 && (() => {
        const limbPairs = Math.max(1, Math.min(3, Math.round(1 + dna.assertiveness * 1.2 + dna.independence * 0.8)));
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
              <meshToonMaterial color={limbColor} emissive={limbColor} emissiveIntensity={emissiveIntensity * 0.8} transparent opacity={0.6 * activityDim} gradientMap={toonGradient} />
            </mesh>,
            <mesh key={`sr-${li}`} ref={li === 0 ? sideRightRef : undefined} position={[xOffset, yOff, 0]} rotation={[-rotVariance, 0, -0.4]}>
              <sphereGeometry args={[limbSize, 8, 8]} />
              <meshToonMaterial color={limbColor} emissive={limbColor} emissiveIntensity={emissiveIntensity * 0.8} transparent opacity={0.6 * activityDim} gradientMap={toonGradient} />
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
    </group>
  );
});
