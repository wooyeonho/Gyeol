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
}

function CoreShape({ shape, color, size, opacity }: { shape: string; color: string; size: number; opacity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const scale = size / 30;
  const meshProps = { ref: meshRef, color, transparent: true as const, opacity };

  switch (shape) {
    case "dot":
      return <mesh {...meshProps}><sphereGeometry args={[0.3 * scale, 16, 16]} /></mesh>;
    case "polygon":
      return <mesh {...meshProps}><octahedronGeometry args={[0.5 * scale, 0]} /></mesh>;
    case "complex":
      return <mesh {...meshProps}><icosahedronGeometry args={[0.5 * scale, 1]} /></mesh>;
    case "transcendent":
      return <mesh {...meshProps}><dodecahedronGeometry args={[0.5 * scale, 0]} /></mesh>;
    default:
      return <mesh {...meshProps}><sphereGeometry args={[0.5 * scale, 32, 32]} /></mesh>;
  }
}

function ParticleRing({ count, color, size }: { count: number; color: string; size: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
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

function Scene({ shape, color, size, glow, animation, particles, vitality, isListening, opacity: propOpacity }: InnerProps) {
  const opacity = propOpacity ?? Math.max(0.3, vitality);
  const pulseScale = isListening ? 1.1 : 1;

  return (
    <>
      <pointLight color={color} intensity={glow / 50} />
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <group scale={pulseScale}>
          <CoreShape shape={shape} color={color} size={size} opacity={opacity} />
        </group>
      </Float>
      {particles > 0 && <ParticleRing count={particles} color={color} size={size} />}
    </>
  );
}

export function VoidCanvasInner(props: InnerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

export default VoidCanvasInner;
