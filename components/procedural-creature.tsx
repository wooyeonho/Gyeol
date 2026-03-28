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
}: ProceduralCreatureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const eyeLRef = useRef<THREE.Mesh>(null);
  const eyeRRef = useRef<THREE.Mesh>(null);
  const crownRef = useRef<THREE.Mesh>(null);
  const sideLeftRef = useRef<THREE.Mesh>(null);
  const sideRightRef = useRef<THREE.Mesh>(null);
  const veilRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);

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

  // Animation: breathing, eye tracking, idle rotation
  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;
    const activityMult = creatureActivity === "sleeping" ? 0.3 : creatureActivity === "drowsy" ? 0.6 : 1;

    // Breathing scale
    const breathSin = Math.sin(breathPhase * Math.PI * 2);
    const heartbeat = Math.pow(Math.max(0, Math.sin(breathPhase * Math.PI * 4)), 3) * 0.03;
    const breathScale = 1 + breathSin * appearance.breatheDepth + heartbeat + excitePulse * 0.12;
    const s = scale * appearance.scale * breathScale;
    groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.08);

    // Idle rotation based on DNA
    const rotSpeed = appearance.idleRotation * activityMult;
    groupRef.current.rotation.y += rotSpeed * 0.01;
    groupRef.current.rotation.x = Math.sin(t * 0.3 * activityMult) * 0.05;

    // Eye tracking
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

  const activityDim = creatureActivity === "sleeping" ? 0.45 : creatureActivity === "drowsy" ? 0.7 : 1;
  const emissiveIntensity = appearance.glowIntensity * 0.3 * activityDim;

  return (
    <group ref={groupRef}>
      {/* Main body mesh */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={Math.max(0.4, activityDim * 0.9)}
          roughness={appearance.roughness}
          metalness={appearance.metalness}
        />
      </mesh>

      {/* Left eye */}
      <group position={eyePositions.left}>
        <mesh>
          <sphereGeometry args={[eyeSize, 12, 12]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.5 * activityDim}
            transparent
            opacity={0.85 * activityDim}
          />
        </mesh>
        <mesh ref={eyeLRef} position={[0, 0, eyeSize * 0.6]}>
          <sphereGeometry args={[eyeSize * 0.45, 10, 10]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.6 * activityDim} />
        </mesh>
      </group>

      {/* Right eye */}
      <group position={eyePositions.right}>
        <mesh>
          <sphereGeometry args={[eyeSize, 12, 12]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.5 * activityDim}
            transparent
            opacity={0.85 * activityDim}
          />
        </mesh>
        <mesh ref={eyeRRef} position={[0, 0, eyeSize * 0.6]}>
          <sphereGeometry args={[eyeSize * 0.45, 10, 10]} />
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
