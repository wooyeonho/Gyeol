"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import type { CreatureActivity } from "@/hooks/use-creature-state";

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
  /** Creature breathing phase 0..1 */
  breathPhase?: number;
  /** Creature activity state */
  creatureActivity?: CreatureActivity;
  /** Excitement pulse 0..1 */
  excitePulse?: number;
  /** Normalized pointer position for eye tracking */
  pointerNorm?: { x: number; y: number };
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

/** Organic firefly-like floating particles */
function OrganicParticles({ count, color, size, motionBias = "gentle", activity = "awake" as CreatureActivity }: { count: number; color: string; size: number; motionBias?: "gentle" | "kinetic" | "mystic"; activity?: CreatureActivity }) {
  const particlesRef = useRef<THREE.InstancedMesh>(null);
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

  useFrame((state) => {
    if (!particlesRef.current) return;
    const t = state.clock.elapsedTime;
    const activityMult = activity === "sleeping" ? 0.2 : activity === "drowsy" ? 0.5 : 1;
    const speedMult = motionBias === "kinetic" ? 1.5 : motionBias === "mystic" ? 0.6 : 1;

    for (let i = 0; i < count; i++) {
      const o = offsets[i];
      const angle = o.angle + t * o.speed * 0.15 * speedMult * activityMult;
      const r = o.radius * scale;
      const wobbleX = Math.sin(t * o.wobble * 10 + o.phase) * 0.08 * scale;
      const wobbleY = Math.cos(t * o.wobble * 8 + o.phase) * 0.06 * scale;

      dummy.position.set(
        Math.cos(angle) * r + wobbleX,
        o.yOffset * scale + wobbleY + Math.sin(t * 0.3 + o.phase) * 0.05 * scale,
        Math.sin(angle) * r,
      );

      const brightness = 0.4 + Math.sin(t * 1.2 + o.brightnessPhase) * 0.35;
      const s = 0.015 + brightness * 0.025;
      dummy.scale.setScalar(s * (activity === "sleeping" ? 0.5 : 1));
      dummy.updateMatrix();
      particlesRef.current.setMatrixAt(i, dummy.matrix);
    }
    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={particlesRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={activity === "sleeping" ? 0.2 : 0.65} />
    </instancedMesh>
  );
}

function Scene({
  shape, color, size, glow, animation, particles, vitality, isListening,
  opacity: propOpacity, motionBias = "gentle", pulseScale: pulseScaleOverride = 1, onTap,
  breathPhase = 0, creatureActivity = "awake" as CreatureActivity, excitePulse = 0, pointerNorm,
}: InnerProps) {
  const opacity = propOpacity ?? Math.max(0.3, vitality);
  const animScale = animation === "pulse-fast" ? 1.06 : animation === "breathe-slow" ? 1.03 : 1;
  const [tapBounce, setTapBounce] = useState(0);
  const tapDecay = useRef(0);

  useFrame((_, delta) => {
    if (tapDecay.current > 0) {
      tapDecay.current = Math.max(0, tapDecay.current - delta * 4);
      setTapBounce(tapDecay.current);
    }
  });

  const handlePointerDown = useCallback(() => {
    tapDecay.current = 1;
    setTapBounce(1);
    onTap?.();
  }, [onTap]);

  // Organic breathing: sin wave + heartbeat double-bump
  const breathSin = Math.sin(breathPhase * Math.PI * 2);
  const heartbeat = Math.pow(Math.max(0, Math.sin(breathPhase * Math.PI * 4)), 3) * 0.03;
  const breathScale = 1 + breathSin * 0.04 + heartbeat + excitePulse * 0.12;

  // Activity-based dimming
  const activityDim = creatureActivity === "sleeping" ? 0.45 : creatureActivity === "drowsy" ? 0.7 : 1;
  const effectiveOpacity = opacity * activityDim;

  const tapScale = 1 + tapBounce * 0.15;
  const pulseScale = (isListening ? 1.1 : 1) * animScale * pulseScaleOverride * tapScale;
  const floatSpeed = motionBias === "kinetic" ? 2.2 : motionBias === "mystic" ? 1.1 : 1.5;
  const floatIntensity = motionBias === "kinetic" ? 0.7 : motionBias === "mystic" ? 0.35 : 0.5;
  const rotationIntensity = motionBias === "kinetic" ? 0.3 : motionBias === "mystic" ? 0.12 : 0.2;
  const tapGlow = (glow / 50 + tapBounce * 0.8) * activityDim + excitePulse * 0.6;

  const sleepFloatMult = creatureActivity === "sleeping" ? 0.3 : creatureActivity === "drowsy" ? 0.6 : 1;

  return (
    <>
      <ambientLight intensity={0.08 * activityDim} />
      <pointLight color={color} intensity={tapGlow} />
      <Float
        speed={floatSpeed * sleepFloatMult}
        rotationIntensity={rotationIntensity * sleepFloatMult}
        floatIntensity={floatIntensity * sleepFloatMult}
      >
        <group scale={pulseScale} onPointerDown={handlePointerDown}>
          <CoreShape
            shape={shape}
            color={color}
            size={size}
            opacity={effectiveOpacity}
            pointerNorm={creatureActivity !== "sleeping" ? pointerNorm : undefined}
            breathScale={breathScale}
          />
        </group>
      </Float>
      {particles > 0 && (
        <OrganicParticles count={particles} color={color} size={size} motionBias={motionBias} activity={creatureActivity} />
      )}
    </>
  );
}

export function VoidCanvasInner(props: InnerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: "low-power" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

export default VoidCanvasInner;
