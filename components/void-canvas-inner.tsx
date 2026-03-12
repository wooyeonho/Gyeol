"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

interface InnerProps {
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
}

function OrbMaterial({ color, opacity }: { color: string; opacity: number }) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} transparent opacity={opacity} roughness={0.3} metalness={0.12} />;
}

function CoreShape({ shape, color, size, opacity }: { shape: string; color: string; size: number; opacity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const scale = size / 30;
  switch (shape) {
    case "dot":
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.3 * scale, 16, 16]} />
          <OrbMaterial color={color} opacity={opacity} />
        </mesh>
      );
    case "creature":
      return (
        <group>
          <mesh ref={meshRef} position={[0, -0.02, 0]}>
            <sphereGeometry args={[0.42 * scale, 24, 24]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
          <mesh position={[-0.18 * scale, 0.22 * scale, 0]}>
            <sphereGeometry args={[0.14 * scale, 18, 18]} />
            <OrbMaterial color={color} opacity={opacity * 0.9} />
          </mesh>
          <mesh position={[0.18 * scale, 0.22 * scale, 0]}>
            <sphereGeometry args={[0.14 * scale, 18, 18]} />
            <OrbMaterial color={color} opacity={opacity * 0.9} />
          </mesh>
        </group>
      );
    case "humanoid":
      return (
        <group>
          <mesh position={[0, 0.22 * scale, 0]}>
            <sphereGeometry args={[0.16 * scale, 24, 24]} />
            <OrbMaterial color={color} opacity={opacity} />
          </mesh>
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
        <group rotation={[0, 0, -0.18]}>
          <mesh ref={meshRef} position={[-0.04 * scale, -0.02 * scale, 0]}>
            <capsuleGeometry args={[0.14 * scale, 0.5 * scale, 5, 14]} />
            <OrbMaterial color={color} opacity={opacity * 0.9} />
          </mesh>
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
        <group>
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
        <group>
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
        <mesh ref={meshRef}>
          <octahedronGeometry args={[0.5 * scale, 0]} />
          <OrbMaterial color={color} opacity={opacity} />
        </mesh>
      );
    case "complex":
      return (
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[0.5 * scale, 1]} />
          <OrbMaterial color={color} opacity={opacity} />
        </mesh>
      );
    case "transcendent":
      return (
        <mesh ref={meshRef}>
          <dodecahedronGeometry args={[0.5 * scale, 0]} />
          <OrbMaterial color={color} opacity={opacity} />
        </mesh>
      );
    default:
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.5 * scale, 32, 32]} />
          <OrbMaterial color={color} opacity={opacity} />
        </mesh>
      );
  }
}

function ParticleRing({ count, color, size, motionBias = "gentle" }: { count: number; color: string; size: number; motionBias?: "gentle" | "kinetic" | "mystic" }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const speed = motionBias === "kinetic" ? 0.4 : motionBias === "mystic" ? 0.16 : 0.24;
      groupRef.current.rotation.y = state.clock.elapsedTime * speed;
    }
  });
  const scale = size / 30;
  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * scale, Math.sin(angle) * 0.2, Math.sin(angle) * scale]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

function Scene({ shape, color, size, glow, animation, particles, vitality, isListening, opacity: propOpacity, motionBias = "gentle", pulseScale: pulseScaleOverride = 1 }: InnerProps) {
  const opacity = propOpacity ?? Math.max(0.3, vitality);
  const animScale = animation === "pulse-fast" ? 1.06 : animation === "breathe-slow" ? 1.03 : 1;
  const pulseScale = (isListening ? 1.1 : 1) * animScale * pulseScaleOverride;
  const floatSpeed = motionBias === "kinetic" ? 2.2 : motionBias === "mystic" ? 1.1 : 1.5;
  const floatIntensity = motionBias === "kinetic" ? 0.7 : motionBias === "mystic" ? 0.35 : 0.5;
  const rotationIntensity = motionBias === "kinetic" ? 0.3 : motionBias === "mystic" ? 0.12 : 0.2;

  return (
    <>
      <pointLight color={color} intensity={glow / 50} />
      <Float speed={floatSpeed} rotationIntensity={rotationIntensity} floatIntensity={floatIntensity}>
        <group scale={pulseScale}>
          <CoreShape shape={shape} color={color} size={size} opacity={opacity} />
        </group>
      </Float>
      {particles > 0 && <ParticleRing count={particles} color={color} size={size} motionBias={motionBias} />}
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
