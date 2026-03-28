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
}

const SPHERE_DETAIL = 4; // icosahedron subdivision level

/**
 * Multi-mesh system: select base geometry per archetype.
 * Each archetype gets a fundamentally different silhouette.
 */
function createArchetypeGeometry(
  archetype: string,
  radius: number,
): THREE.BufferGeometry {
  switch (archetype) {
    case "crystalline":
      // Octahedron — sharp faceted crystal
      return new THREE.OctahedronGeometry(radius, 1);
    case "mechanical":
      // Dodecahedron — geometric precision
      return new THREE.DodecahedronGeometry(radius, 1);
    case "volcanic":
      // Low-poly icosahedron — spiky rough surface
      return new THREE.IcosahedronGeometry(radius, 1);
    case "fluid":
      // High-detail sphere — smooth flowing surface
      return new THREE.SphereGeometry(radius, 24, 16);
    case "spectral":
      // Tetrahedron base — ethereal minimal form
      return new THREE.TetrahedronGeometry(radius, 2);
    case "verdant":
      // Dodecahedron — organic faceted leaf-like form
      return new THREE.DodecahedronGeometry(radius, 2);
    case "ethereal":
      // High-detail icosahedron — smooth ethereal body
      return new THREE.IcosahedronGeometry(radius, SPHERE_DETAIL + 1);
    case "organic":
    default:
      // Standard icosahedron — classic organic form
      return new THREE.IcosahedronGeometry(radius, SPHERE_DETAIL);
  }
}

/**
 * A fully procedural creature mesh driven entirely by DNA.
 * Uses morph targets on an icosahedron to create unique body shapes,
 * with DNA-derived colors, glow, and animation parameters.
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
}: ProceduralCreatureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const eyeLRef = useRef<THREE.Mesh>(null);
  const eyeRRef = useRef<THREE.Mesh>(null);
  const crownRef = useRef<THREE.Mesh>(null);
  const sideLeftRef = useRef<THREE.Mesh>(null);
  const sideRightRef = useRef<THREE.Mesh>(null);
  const veilRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const listeningLeanRef = useRef(0);
  const eyeScaleRef = useRef(1);

  // Derive all visual parameters from DNA (memoized — only recomputes when DNA changes)
  const appearance = useMemo(() => deriveDNAAppearance(dna, species), [dna, species]);
  const morphWeights = useMemo(() => deriveMorphWeights(dna, species), [dna, species]);

  // Create the deformed geometry with morph targets applied at init time
  // Uses archetype-specific base geometry for unique silhouettes
  const geometry = useMemo(() => {
    const base = createArchetypeGeometry(species.archetype, 0.42);
    const positions = base.attributes.position.array as Float32Array;

    // Compute and apply displacement
    const displacements = computeVertexDisplacements(positions, morphWeights);
    const morphed = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i++) {
      morphed[i] = positions[i] + displacements[i];
    }

    base.setAttribute("position", new THREE.BufferAttribute(morphed, 3));
    base.computeVertexNormals();
    // Store base positions for vertex wave animation
    (base.attributes.position as THREE.BufferAttribute & { _basePositions?: Float32Array })._basePositions = new Float32Array(morphed);
    return base;
  }, [morphWeights, species.archetype]);

  // Colors from appearance
  const primaryColor = useMemo(() => {
    const h = appearance.primaryHue / 360;
    const s = appearance.primarySaturation / 100;
    const l = appearance.primaryLightness / 100;
    return new THREE.Color().setHSL(h, s, l);
  }, [appearance]);

  const eyeColor = useMemo(() => {
    return new THREE.Color().setHSL(appearance.eyeHue / 360, 0.75, 0.6);
  }, [appearance]);

  // Eye positions derived from body shape
  const eyePositions = useMemo(() => {
    const spread = 0.14 * (1 + morphWeights.sideSpread * 0.3);
    const height = 0.18 * (1 + morphWeights.bodyStretch * 0.4 + morphWeights.crownGrowth * 0.3);
    const depth = 0.32 * (1 + morphWeights.bodyBulge * 0.15);
    return {
      left: [-spread, height, depth] as [number, number, number],
      right: [spread, height, depth] as [number, number, number],
    };
  }, [morphWeights]);

  const eyeSize = 0.055 * (1 + morphWeights.bodyBulge * 0.2);

  // Mood-based visual modifiers
  const moodMod = useMemo(() => {
    switch (mood) {
      case "joyful": case "energetic": return { emissiveBoost: 0.15, speedMult: 1.3, tiltBias: 0.02 };
      case "melancholy": case "sad": return { emissiveBoost: -0.1, speedMult: 0.6, tiltBias: -0.04 };
      case "curious": return { emissiveBoost: 0.05, speedMult: 1.1, tiltBias: 0.03 };
      case "angry": return { emissiveBoost: 0.2, speedMult: 1.5, tiltBias: 0 };
      default: return { emissiveBoost: 0, speedMult: 1, tiltBias: 0 };
    }
  }, [mood]);

  const activityDim = creatureActivity === "sleeping" ? 0.45 : creatureActivity === "drowsy" ? 0.7 : 1;
  const emissiveIntensity = Math.max(0.05, (appearance.glowIntensity * 0.3 + moodMod.emissiveBoost) * activityDim);

  // Animation: breathing, eye tracking, idle rotation, listening posture, vertex wave
  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;
    const dt = state.clock.getDelta();
    const activityMult = creatureActivity === "sleeping" ? 0.3 : creatureActivity === "drowsy" ? 0.6 : 1;

    // === LISTENING POSTURE: lean forward + eyes widen when AI is streaming ===
    const leanTarget = isListening ? 0.12 : 0;
    listeningLeanRef.current += (leanTarget - listeningLeanRef.current) * 0.06;
    const eyeScaleTarget = isListening ? 1.25 : 1;
    eyeScaleRef.current += (eyeScaleTarget - eyeScaleRef.current) * 0.08;

    // Breathing scale with mood influence
    const breathSin = Math.sin(breathPhase * Math.PI * 2 * moodMod.speedMult);
    const heartbeat = Math.pow(Math.max(0, Math.sin(breathPhase * Math.PI * 4)), 3) * 0.03;
    const breathScale = 1 + breathSin * appearance.breatheDepth + heartbeat + excitePulse * 0.12;
    const s = scale * appearance.scale * breathScale;
    groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.08);

    // Idle rotation + mood tilt + listening lean
    const rotSpeed = appearance.idleRotation * activityMult * moodMod.speedMult;
    groupRef.current.rotation.y += rotSpeed * 0.01;
    groupRef.current.rotation.x = Math.sin(t * 0.3 * activityMult) * 0.05 + moodMod.tiltBias;
    // Lean forward on Z axis when listening
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      listeningLeanRef.current,
      0.06
    );

    // === VERTEX WAVE: surface displacement for "living skin" effect ===
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      if (positions && (positions as THREE.BufferAttribute & { _basePositions?: Float32Array })._basePositions) {
        const base = (positions as THREE.BufferAttribute & { _basePositions: Float32Array })._basePositions;
        const arr = positions.array as Float32Array;
        const waveAmp = 0.008 * activityMult * moodMod.speedMult;
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

    // === FRESNEL HALO: pulsing glow sphere ===
    if (haloRef.current) {
      const haloPulse = 1 + Math.sin(t * 0.8) * 0.05 + excitePulse * 0.1;
      haloRef.current.scale.setScalar(haloPulse);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity =
        (0.06 + appearance.glowIntensity * 0.08 + moodMod.emissiveBoost * 0.03) * activityDim;
    }

    // Eye tracking with listening-widened eyes
    const pn = creatureActivity === "sleeping" ? { x: 0, y: 0 } : pointerNorm ?? { x: 0, y: 0 };
    for (const eyeRef of [eyeLRef, eyeRRef]) {
      if (eyeRef.current) {
        const targetX = pn.x * eyeSize * 0.3;
        const targetY = -pn.y * eyeSize * 0.3;
        eyeRef.current.position.x = THREE.MathUtils.lerp(eyeRef.current.position.x, targetX, 0.08);
        eyeRef.current.position.y = THREE.MathUtils.lerp(eyeRef.current.position.y, targetY, 0.08);
      }
    }

    // ── Appendage dynamic animations ──
    // Crown: sway with breathing + gentle wind oscillation
    if (crownRef.current) {
      const windPhase = t * 1.2 + 0.5;
      const sway = Math.sin(windPhase) * 0.12 * activityMult;
      const breathTilt = breathSin * 0.06;
      crownRef.current.rotation.x = sway + breathTilt;
      crownRef.current.rotation.z = Math.cos(windPhase * 0.7) * 0.08 * activityMult;
      // Subtle scale pulse with breathing
      const crownPulse = 1 + breathSin * 0.05;
      crownRef.current.scale.setScalar(crownPulse);
    }

    // Side appendages: flap/bob with breathing + asymmetric wind
    if (sideLeftRef.current) {
      const flapPhase = t * 0.8;
      const flapAngle = Math.sin(flapPhase) * 0.15 * activityMult;
      const breathLift = breathSin * 0.08;
      sideLeftRef.current.rotation.z = 0.4 + flapAngle + breathLift;
      sideLeftRef.current.position.y = Math.sin(flapPhase * 1.3) * 0.02 * activityMult;
    }
    if (sideRightRef.current) {
      const flapPhase = t * 0.8 + Math.PI * 0.3; // slightly offset for organic feel
      const flapAngle = Math.sin(flapPhase) * 0.15 * activityMult;
      const breathLift = breathSin * 0.08;
      sideRightRef.current.rotation.z = -0.4 - flapAngle - breathLift;
      sideRightRef.current.position.y = Math.sin(flapPhase * 1.3) * 0.02 * activityMult;
    }

    // Veil tendrils: undulate like seaweed in a current
    for (let vi = 0; vi < 3; vi++) {
      const veilMesh = veilRefs.current[vi];
      if (!veilMesh) continue;
      const phase = t * 0.6 + vi * (Math.PI * 2 / 3);
      const swingX = Math.sin(phase) * 0.2 * activityMult;
      const swingZ = Math.cos(phase * 0.8 + 0.5) * 0.15 * activityMult;
      const breathSwing = breathSin * 0.1;
      veilMesh.rotation.x = swingX + breathSwing;
      veilMesh.rotation.z = swingZ;
      // Gentle stretch with breathing
      const veilPulse = 1 + breathSin * 0.04;
      veilMesh.scale.y = veilPulse;
    }
  });

  // Base eye size (dynamic scaling handled in useFrame via eyeScaleRef)
  const dynEyeSize = eyeSize;

  return (
    <group ref={groupRef}>
      {/* === FRESNEL HALO: translucent glow sphere behind creature === */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.58, 24, 24]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.06 + appearance.glowIntensity * 0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Main body mesh */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={Math.max(0.4, activityDim * 0.9 * Math.max(0.5, vitality))}
          roughness={appearance.roughness}
          metalness={appearance.metalness}
        />
      </mesh>

      {/* Left eye — scales up when listening */}
      <group position={eyePositions.left}>
        <mesh>
          <sphereGeometry args={[dynEyeSize, 12, 12]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.5 * activityDim}
            transparent
            opacity={0.85 * activityDim}
          />
        </mesh>
        <mesh ref={eyeLRef} position={[0, 0, dynEyeSize * 0.6]}>
          <sphereGeometry args={[dynEyeSize * 0.45, 10, 10]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.6 * activityDim} />
        </mesh>
      </group>

      {/* Right eye — scales up when listening */}
      <group position={eyePositions.right}>
        <mesh>
          <sphereGeometry args={[dynEyeSize, 12, 12]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.5 * activityDim}
            transparent
            opacity={0.85 * activityDim}
          />
        </mesh>
        <mesh ref={eyeRRef} position={[0, 0, dynEyeSize * 0.6]}>
          <sphereGeometry args={[dynEyeSize * 0.45, 10, 10]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.6 * activityDim} />
        </mesh>
      </group>

      {/* Crown appendage for high-creativity creatures — animated sway */}
      {morphWeights.crownGrowth > 0.3 && (
        <mesh ref={crownRef} position={[0, 0.42 + morphWeights.crownGrowth * 0.2, 0]}>
          <coneGeometry args={[0.06 + morphWeights.crownGrowth * 0.04, 0.15 + morphWeights.crownGrowth * 0.2, 5]} />
          <meshStandardMaterial
            color={primaryColor}
            emissive={primaryColor}
            emissiveIntensity={emissiveIntensity * 1.2}
            transparent
            opacity={0.7 * activityDim}
          />
        </mesh>
      )}

      {/* Side appendages for assertive creatures — animated flap */}
      {morphWeights.sideSpread > 0.35 && (
        <>
          <mesh ref={sideLeftRef} position={[-0.38 - morphWeights.sideSpread * 0.1, 0, 0]} rotation={[0, 0, 0.4]}>
            <sphereGeometry args={[0.08 + morphWeights.sideSpread * 0.05, 8, 8]} />
            <meshStandardMaterial
              color={primaryColor}
              emissive={primaryColor}
              emissiveIntensity={emissiveIntensity * 0.8}
              transparent
              opacity={0.6 * activityDim}
            />
          </mesh>
          <mesh ref={sideRightRef} position={[0.38 + morphWeights.sideSpread * 0.1, 0, 0]} rotation={[0, 0, -0.4]}>
            <sphereGeometry args={[0.08 + morphWeights.sideSpread * 0.05, 8, 8]} />
            <meshStandardMaterial
              color={primaryColor}
              emissive={primaryColor}
              emissiveIntensity={emissiveIntensity * 0.8}
              transparent
              opacity={0.6 * activityDim}
            />
          </mesh>
        </>
      )}

      {/* Veil drape tendrils for open/empathic creatures — animated undulation */}
      {morphWeights.veilDrape > 0.3 && (
        <>
          {[0, 1, 2].map((i) => {
            const angle = (i / 3) * Math.PI * 2;
            const drapLen = 0.15 + morphWeights.veilDrape * 0.2;
            return (
              <mesh
                key={i}
                ref={(el) => { veilRefs.current[i] = el; }}
                position={[
                  Math.cos(angle) * 0.15,
                  -0.35 - morphWeights.veilDrape * 0.15,
                  Math.sin(angle) * 0.15,
                ]}
              >
                <capsuleGeometry args={[0.02, drapLen, 4, 6]} />
                <meshStandardMaterial
                  color={primaryColor}
                  emissive={primaryColor}
                  emissiveIntensity={emissiveIntensity * 0.6}
                  transparent
                  opacity={0.4 * activityDim}
                />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
});
