"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { CreatureActivity } from "@/hooks/use-creature-state";
import type { CreatureDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { deriveDNAAppearance } from "@/lib/genome/appearance";
import { ProceduralCreature } from "@/components/procedural-creature";
import {
  classifyTouch,
  detectBodyPart,
  computePhysicsResponse,
  tickPhysicsState,
  createInitialPhysicsState,
  applyPhysicsResponse,
  type TouchPhysicsState,
} from "@/lib/creature/touch-physics";
import type { ForceState } from "@/lib/creature/force-system";
import type { IdleBehaviorParams } from "@/lib/creature/idle-behaviors";

export interface InnerProps {
  shape: string;
  color: string;
  size: number;
  glow: number;
  animation: string;
  particles: number;
  vitality: number;
  isListening: boolean;
  background?: string;
  opacity?: number;
  motionBias?: "gentle" | "kinetic" | "mystic";
  pulseScale?: number;
  onTap?: () => void;
  /** Called when creature is touched with affinity delta */
  onCreatureTouch?: (affinityDelta: number) => void;
  /** Creature breathing phase 0..1 */
  breathPhase?: number;
  /** Creature activity state */
  creatureActivity?: CreatureActivity;
  /** Excitement pulse 0..1 */
  excitePulse?: number;
  /** Normalized pointer position for eye tracking */
  pointerNorm?: { x: number; y: number };
  /** Translated label for WebGL context-loss overlay */
  restoring3dLabel?: string;
  /** Creature DNA for procedural rendering */
  dna?: CreatureDNA | null;
  /** Current mood for visual modulation */
  mood?: string | null;
  /** 0..1 conversation energy — accumulated from chat frequency, decays over time */
  conversationEnergy?: number;
  /** Evolution generation level (1+, no upper bound) */
  genLevel?: number;
  /** Force-based physics state — drives emergent position/rotation/scale */
  forceState?: ForceState | null;
  /** Idle behavior visual parameters for creature animation */
  idleBehaviorParams?: IdleBehaviorParams;
}

const OrbMaterial = React.memo(function OrbMaterial({ color, opacity, emissiveIntensity = 0.28 }: { color: string; opacity: number; emissiveIntensity?: number }) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} transparent opacity={opacity} roughness={0.3} metalness={0.12} />;
});

/** Glowing eye that tracks pointer position */
function CreatureEye({ position, size, color, pointerNorm }: { position: [number, number, number]; size: number; color: string; pointerNorm: { x: number; y: number } }) {
  const pupilRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (pupilRef.current) {
      const targetX = pointerNorm.x * size * 0.3;
      const targetY = -pointerNorm.y * size * 0.3;
      pupilRef.current.position.x = THREE.MathUtils.lerp(pupilRef.current.position.x, targetX, 0.08);
      pupilRef.current.position.y = THREE.MathUtils.lerp(pupilRef.current.position.y, targetY, 0.08);
    }
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} transparent opacity={0.85} />
      </mesh>
      <mesh ref={pupilRef} position={[0, 0, size * 0.6]}>
        <sphereGeometry args={[size * 0.45, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function CoreShape({ shape, color, size, opacity, pointerNorm, breathScale = 1 }: { shape: string; color: string; size: number; opacity: number; pointerNorm?: { x: number; y: number }; breathScale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (groupRef.current) {
      const s = THREE.MathUtils.lerp(groupRef.current.scale.x, breathScale, 0.06);
      groupRef.current.scale.setScalar(s);
    }
  });

  const scale = size / 30;
  const eyeSize = 0.06 * scale;
  const pn = pointerNorm ?? { x: 0, y: 0 };

  switch (shape) {
    case "dot":
      return (
        <group ref={groupRef}>
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.3 * scale, 16, 16]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
        </group>
      );
    case "creature":
      return (
        <group ref={groupRef}>
          <mesh ref={meshRef} position={[0, -0.02, 0]}>
            <sphereGeometry args={[0.42 * scale, 24, 24]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
          <CreatureEye position={[-0.14 * scale, 0.18 * scale, 0.32 * scale]} size={eyeSize} color={color} pointerNorm={pn} />
          <CreatureEye position={[0.14 * scale, 0.18 * scale, 0.32 * scale]} size={eyeSize} color={color} pointerNorm={pn} />
          <mesh position={[-0.18 * scale, 0.28 * scale, 0]}>
            <sphereGeometry args={[0.12 * scale, 18, 18]} />
            <OrbMaterial color={color} opacity={opacity * 0.9} />
          </mesh>
          <mesh position={[0.18 * scale, 0.28 * scale, 0]}>
            <sphereGeometry args={[0.12 * scale, 18, 18]} />
            <OrbMaterial color={color} opacity={opacity * 0.9} />
          </mesh>
        </group>
      );
    case "humanoid":
      return (
        <group ref={groupRef}>
          <mesh position={[0, 0.22 * scale, 0]}>
            <sphereGeometry args={[0.16 * scale, 24, 24]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
          <CreatureEye position={[-0.06 * scale, 0.26 * scale, 0.12 * scale]} size={eyeSize * 0.7} color={color} pointerNorm={pn} />
          <CreatureEye position={[0.06 * scale, 0.26 * scale, 0.12 * scale]} size={eyeSize * 0.7} color={color} pointerNorm={pn} />
          <mesh ref={meshRef} position={[0, -0.06 * scale, 0]}>
            <capsuleGeometry args={[0.16 * scale, 0.46 * scale, 6, 14]} />
            <OrbMaterial color={color} opacity={opacity * 0.92} />
          </mesh>
          <mesh position={[0, -0.18 * scale, 0]}>
            <torusGeometry args={[0.26 * scale, 0.04 * scale, 10, 30]} />
            <OrbMaterial color={color} opacity={opacity * 0.4} />
          </mesh>
        </group>
      );
    case "beast":
      return (
        <group ref={groupRef} rotation={[0, 0, -0.18]}>
          <mesh ref={meshRef} position={[-0.04 * scale, -0.02 * scale, 0]}>
            <capsuleGeometry args={[0.14 * scale, 0.5 * scale, 5, 14]} />
            <OrbMaterial color={color} opacity={opacity * 0.9} />
          </mesh>
          <CreatureEye position={[0.14 * scale, 0.12 * scale, 0.12 * scale]} size={eyeSize * 0.9} color="#ff4444" pointerNorm={pn} />
          <CreatureEye position={[0.28 * scale, 0.06 * scale, 0.12 * scale]} size={eyeSize * 0.9} color="#ff4444" pointerNorm={pn} />
          <mesh position={[0.24 * scale, 0.12 * scale, 0]}>
            <coneGeometry args={[0.18 * scale, 0.3 * scale, 4]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
          <mesh position={[-0.28 * scale, -0.06 * scale, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.1 * scale, 0.28 * scale, 4]} />
            <OrbMaterial color={color} opacity={opacity * 0.6} />
          </mesh>
        </group>
      );
    case "amorphous":
      return (
        <group ref={groupRef}>
          <mesh ref={meshRef} position={[0, 0, 0]}>
            <icosahedronGeometry args={[0.38 * scale, 1]} />
            <OrbMaterial color={color} opacity={opacity * 0.95} />
          </mesh>
          <mesh position={[0.26 * scale, -0.08 * scale, 0]}>
            <sphereGeometry args={[0.16 * scale, 18, 18]} />
            <OrbMaterial color={color} opacity={opacity * 0.58} />
          </mesh>
          <mesh position={[-0.22 * scale, 0.2 * scale, 0]}>
            <sphereGeometry args={[0.12 * scale, 18, 18]} />
            <OrbMaterial color={color} opacity={opacity * 0.52} />
          </mesh>
        </group>
      );
    case "seraph":
      return (
        <group ref={groupRef}>
          <mesh ref={meshRef}>
            <octahedronGeometry args={[0.32 * scale, 0]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
          <mesh position={[-0.32 * scale, 0, 0]} rotation={[0, 0, 0.5]}>
            <torusGeometry args={[0.16 * scale, 0.03 * scale, 8, 24, Math.PI]} />
            <OrbMaterial color={color} opacity={opacity * 0.36} />
          </mesh>
          <mesh position={[0.32 * scale, 0, 0]} rotation={[0, 0, -0.5]}>
            <torusGeometry args={[0.16 * scale, 0.03 * scale, 8, 24, Math.PI]} />
            <OrbMaterial color={color} opacity={opacity * 0.36} />
          </mesh>
        </group>
      );
    case "polygon":
      return (
        <group ref={groupRef}>
          <mesh ref={meshRef}>
            <octahedronGeometry args={[0.5 * scale, 0]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
        </group>
      );
    case "complex":
      return (
        <group ref={groupRef}>
          <mesh ref={meshRef}>
            <icosahedronGeometry args={[0.5 * scale, 1]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
        </group>
      );
    case "transcendent":
      return (
        <group ref={groupRef}>
          <mesh ref={meshRef}>
            <dodecahedronGeometry args={[0.5 * scale, 0]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
        </group>
      );
    default:
      return (
        <group ref={groupRef}>
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.5 * scale, 32, 32]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
        </group>
      );
  }
}

/** Simple seeded pseudo-random (Mulberry32) — deterministic per seed, avoids lint impure errors */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Organic firefly-like floating particles — dual-color + DNA-driven behavior */
function OrganicParticles({ count, color, secondaryColor, size, motionBias = "gentle", activity = "awake" as CreatureActivity, dna, mood, conversationEnergy = 0 }: { count: number; color: string; secondaryColor?: string; size: number; motionBias?: "gentle" | "kinetic" | "mystic"; activity?: CreatureActivity; dna?: CreatureDNA | null; mood?: string | null; conversationEnergy?: number }) {
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const secondaryRef = useRef<THREE.InstancedMesh>(null);
  const scale = size / 30;

  const offsets = useMemo(() => {
    const rng = mulberry32(42);
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2 + rng() * 0.5,
      radius: 0.6 + rng() * 0.8,
      yOffset: (rng() - 0.5) * 0.6,
      speed: 0.3 + rng() * 0.7,
      phase: rng() * Math.PI * 2,
      wobble: 0.02 + rng() * 0.06,
      brightnessPhase: rng() * Math.PI * 2,
    }));
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Compute split counts for dual-color mode
  const hasDualColor = !!(secondaryColor && count > 2);
  const primaryCount = hasDualColor ? Math.ceil(count * 0.6) : count;
  const secondaryCount = hasDualColor ? count - primaryCount : 0;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const activityMult = activity === "sleeping" ? 0.2 : activity === "drowsy" ? 0.5 : 1;
    const speedMult = motionBias === "kinetic" ? 1.5 : motionBias === "mystic" ? 0.6 : 1;
    // DNA-driven particle behavior
    const dnaSpeedBoost = dna ? (dna.intensity * 0.4 + dna.playfulness * 0.3) : 0;
    const dnaDriftBoost = dna ? (dna.independence * 0.3 + dna.openness * 0.2) : 0;
    const moodSpeedMod = mood === "joyful" || mood === "energetic" || mood === "excited" || mood === "playful" ? 1.3
      : mood === "melancholy" || mood === "sad" || mood === "bored" || mood === "sleepy" ? 0.5
      : mood === "angry" || mood === "frustrated" || mood === "scared" ? 1.5
      : 1;
    // Conversation energy makes particles more lively
    const energyMult = 1 + conversationEnergy * 0.4;

    for (let i = 0; i < count; i++) {
      const o = offsets[i];
      const angle = o.angle + t * o.speed * 0.15 * speedMult * activityMult * (1 + dnaSpeedBoost) * moodSpeedMod * energyMult;
      const r = o.radius * scale * (1 + dnaDriftBoost * 0.3);
      const wobbleX = Math.sin(t * o.wobble * 10 + o.phase) * 0.08 * scale * (1 + dnaSpeedBoost * 0.5);
      const wobbleY = Math.cos(t * o.wobble * 8 + o.phase) * 0.06 * scale * (1 + dnaSpeedBoost * 0.5);

      dummy.position.set(
        Math.cos(angle) * r + wobbleX,
        o.yOffset * scale + wobbleY + Math.sin(t * 0.3 + o.phase) * 0.05 * scale,
        Math.sin(angle) * r,
      );

      const brightness = 0.4 + Math.sin(t * 1.2 + o.brightnessPhase) * 0.35;
      const s = 0.015 + brightness * 0.025;
      dummy.scale.setScalar(s * (activity === "sleeping" ? 0.5 : 1));
      dummy.updateMatrix();

      // In dual-color mode, route to primary or secondary mesh
      if (hasDualColor) {
        if (i < primaryCount) {
          particlesRef.current?.setMatrixAt(i, dummy.matrix);
        } else {
          secondaryRef.current?.setMatrixAt(i - primaryCount, dummy.matrix);
        }
      } else {
        particlesRef.current?.setMatrixAt(i, dummy.matrix);
      }
    }
    if (particlesRef.current) particlesRef.current.instanceMatrix.needsUpdate = true;
    if (secondaryRef.current) secondaryRef.current.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  const baseOpacity = activity === "sleeping" ? 0.2 : 0.65;

  // If we have a secondary color, split particles into two groups
  if (hasDualColor) {
    return (
      <>
        <instancedMesh ref={particlesRef} args={[undefined, undefined, primaryCount]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={baseOpacity} />
        </instancedMesh>
        <instancedMesh ref={secondaryRef} args={[undefined, undefined, secondaryCount]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={secondaryColor} transparent opacity={baseOpacity * 0.8} />
        </instancedMesh>
      </>
    );
  }

  return (
    <instancedMesh ref={particlesRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={baseOpacity} />
    </instancedMesh>
  );
}

function Scene({
  shape, color, size, glow, animation, particles, vitality, isListening,
  opacity: propOpacity, motionBias = "gentle", pulseScale: pulseScaleOverride = 1, onTap,
  onCreatureTouch,
  breathPhase = 0, creatureActivity = "awake" as CreatureActivity, excitePulse = 0, pointerNorm,
  dna, mood, conversationEnergy = 0, genLevel, forceState, idleBehaviorParams,
}: InnerProps) {
  const opacity = propOpacity ?? Math.max(0.3, vitality);
  const animScale = animation === "pulse-fast" ? 1.06 : animation === "breathe-slow" ? 1.03 : 1;
  const [tapBounce, setTapBounce] = useState(0);
  const tapDecay = useRef(0);

  // Zelda-like touch physics engine — full gesture classification + physics response
  const pointerDownTimeRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const pointerMoveDistRef = useRef(0);
  const lastHitPointRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const physicsStateRef = useRef<TouchPhysicsState>(createInitialPhysicsState());
  const [physicsScale, setPhysicsScale] = useState(1);
  const [physicsFlash, setPhysicsFlash] = useState(0);

  useFrame((_, delta) => {
    if (tapDecay.current > 0) {
      tapDecay.current = Math.max(0, tapDecay.current - delta * 4);
      setTapBounce(tapDecay.current);
    }
    // Tick physics decay every frame for smooth bounce/flash
    const ps = physicsStateRef.current;
    if (ps.scaleMult !== 1 || ps.flash > 0.01) {
      physicsStateRef.current = tickPhysicsState(ps, delta * 1000);
      setPhysicsScale(physicsStateRef.current.scaleMult);
      setPhysicsFlash(physicsStateRef.current.flash);
    }
  });

  const handlePointerDown = useCallback((e: { point?: { x: number; y: number; z: number }; clientX?: number; clientY?: number }) => {
    pointerDownTimeRef.current = Date.now();
    const px = e.point?.x ?? 0;
    const py = e.point?.y ?? 0;
    const pz = e.point?.z ?? 0;
    pointerStartRef.current = { x: px, y: py, z: pz };
    lastHitPointRef.current = { x: px, y: py, z: pz };
    pointerMoveDistRef.current = 0;
    tapDecay.current = 1;
    setTapBounce(1);
    onTap?.();
  }, [onTap]);

  const handlePointerUp = useCallback(() => {
    const now = Date.now();
    const duration = now - pointerDownTimeRef.current;
    const dist = pointerMoveDistRef.current;
    // Velocity = total distance / time (pixels per ms)
    const velocity = duration > 0 ? (dist / duration) * 1000 : 0;

    // Full physics engine classification
    const touchType = classifyTouch(duration, velocity, dist * 100); // scale dist to px-like units
    const bodyPart = detectBodyPart(lastHitPointRef.current);
    const touchEvent = {
      type: touchType,
      part: bodyPart,
      duration,
      velocity,
      timestamp: now,
    };
    const response = computePhysicsResponse(touchEvent);

    // Apply physics response (bounce, flash, eye reaction)
    physicsStateRef.current = applyPhysicsResponse(physicsStateRef.current, response, now);
    setPhysicsScale(physicsStateRef.current.scaleMult);
    setPhysicsFlash(response.flashIntensity);

    // Report affinity delta to parent
    onCreatureTouch?.(response.affinityDelta);
    pointerStartRef.current = null;
  }, [onCreatureTouch]);

  const handlePointerMove = useCallback((e: { point?: { x: number; y: number; z: number } }) => {
    if (!pointerStartRef.current) return;
    const px = e.point?.x ?? 0;
    const py = e.point?.y ?? 0;
    const dx = px - pointerStartRef.current.x;
    const dy = py - pointerStartRef.current.y;
    pointerMoveDistRef.current += Math.sqrt(dx * dx + dy * dy);
    pointerStartRef.current = { x: px, y: py, z: e.point?.z ?? 0 };
    lastHitPointRef.current = { x: px, y: py, z: e.point?.z ?? 0 };
  }, []);

  // Memoize deriveSpecies to avoid creating new object refs every render (~15fps),
  // which would defeat React.memo on ProceduralCreature and rebuild geometry each frame.
  const species = useMemo(() => dna ? deriveSpecies(dna) : null, [dna]);

  // Derive secondary color from DNA for dual-color particles
  const secondaryParticleColor = useMemo(() => {
    if (!dna || !species) return undefined;
    const appearance = deriveDNAAppearance(dna, species, genLevel);
    const h2 = Math.round((appearance.primaryHue + appearance.secondaryHueShift) % 360);
    const s = Math.round(appearance.primarySaturation - 5);
    const l = Math.round(appearance.primaryLightness + 5);
    return `hsl(${h2}, ${s}%, ${l}%)`;
  }, [dna, species, genLevel]);

  // Organic breathing: sin wave + heartbeat double-bump
  const breathSin = Math.sin(breathPhase * Math.PI * 2);
  const heartbeat = Math.pow(Math.max(0, Math.sin(breathPhase * Math.PI * 4)), 3) * 0.03;
  const breathScale = 1 + breathSin * 0.04 + heartbeat + excitePulse * 0.12;

  // Activity-based dimming
  const activityDim = creatureActivity === "sleeping" ? 0.45 : creatureActivity === "drowsy" ? 0.7 : 1;
  const effectiveOpacity = opacity * activityDim;

  const tapScale = 1 + tapBounce * 0.15;
  const touchPhysicsScaleMult = physicsScale;
  const pulseScale = (isListening ? 1.1 : 1) * animScale * pulseScaleOverride * tapScale * touchPhysicsScaleMult;
  const floatSpeed = motionBias === "kinetic" ? 2.2 : motionBias === "mystic" ? 1.1 : 1.5;
  const floatIntensity = motionBias === "kinetic" ? 0.7 : motionBias === "mystic" ? 0.35 : 0.5;
  const rotationIntensity = motionBias === "kinetic" ? 0.3 : motionBias === "mystic" ? 0.12 : 0.2;
  const tapGlow = (glow / 50 + tapBounce * 0.8 + physicsFlash * 0.5) * activityDim + excitePulse * 0.6;

  const sleepFloatMult = creatureActivity === "sleeping" ? 0.3 : creatureActivity === "drowsy" ? 0.6 : 1;

  return (
    <>
      {/* Enhanced lighting for toon shading — stronger directional + ambient for flat color steps */}
      <ambientLight intensity={0.25 * activityDim} />
      <directionalLight position={[2, 3, 4]} intensity={0.6 * activityDim} />
      <pointLight color={color} intensity={tapGlow} />
      <Float
        speed={floatSpeed * sleepFloatMult}
        rotationIntensity={rotationIntensity * sleepFloatMult}
        floatIntensity={floatIntensity * sleepFloatMult}
      >
        <group scale={pulseScale} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerMove={handlePointerMove}>
          {dna && species ? (
            <ProceduralCreature
              dna={dna}
              species={species}
              scale={size / 30}
              breathPhase={breathPhase}
              creatureActivity={creatureActivity}
              excitePulse={excitePulse}
              pointerNorm={creatureActivity !== "sleeping" ? pointerNorm : undefined}
              isListening={isListening}
              mood={mood}
              vitality={vitality}
              conversationEnergy={conversationEnergy}
              genLevel={genLevel}
              forceState={forceState}
              idleBehaviorParams={idleBehaviorParams}
            />
          ) : (
            <CoreShape
              shape={shape}
              color={color}
              size={size}
              opacity={effectiveOpacity}
              pointerNorm={creatureActivity !== "sleeping" ? pointerNorm : undefined}
              breathScale={breathScale}
            />
          )}
        </group>
      </Float>
      {particles > 0 && (
        <OrganicParticles count={particles} color={color} secondaryColor={secondaryParticleColor} size={size} motionBias={motionBias} activity={creatureActivity} dna={dna} mood={mood} conversationEnergy={conversationEnergy} />
      )}
      {/* Bloom: intensity varies by archetype — only ethereal/spectral should look truly glowy */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          intensity={(() => {
            const arch = species?.archetype;
            switch (arch) {
              case "ethereal": case "spectral": return 1.0;
              case "volcanic": return 0.6;
              case "crystalline": return 0.5;
              case "fluid": return 0.4;
              case "organic": case "verdant": return 0.3;
              case "mechanical": return 0.2;
              default: return 0.5;
            }
          })()}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/** Hook to attach WebGL context loss/restore listeners to the R3F canvas */
function useContextRecovery(onLost: () => void, onRestored: () => void) {
  const domRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = domRef.current;
    if (!container) return;
    const canvas = container.querySelector("canvas");
    if (!canvas) return;

    const handleLost = (e: Event) => {
      e.preventDefault();
      console.warn("[VoidCanvasInner] WebGL context lost — waiting for restore");
      onLost();
    };
    const handleRestored = () => {
      console.info("[VoidCanvasInner] WebGL context restored");
      onRestored();
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    canvas.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [onLost, onRestored]);

  return domRef;
}

export function VoidCanvasInner({ restoring3dLabel, ...props }: InnerProps) {
  const [contextLost, setContextLost] = useState(false);
  const handleLost = useCallback(() => setContextLost(true), []);
  const handleRestored = useCallback(() => setContextLost(false), []);
  const wrapperRef = useContextRecovery(handleLost, handleRestored);

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "default", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <Scene {...props} />
      </Canvas>
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white/40 text-sm">
          <span className="animate-pulse">{restoring3dLabel || "Restoring 3D..."}</span>
        </div>
      )}
    </div>
  );
}

export default VoidCanvasInner;
