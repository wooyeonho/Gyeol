"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
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

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function CoreShape({ shape, color, size, opacity, isListening }: {
  shape: string; color: string; size: number; opacity: number; isListening: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const targetScale = useRef(1);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    meshRef.current.position.y = Math.sin(t * 0.6) * 0.08;
    meshRef.current.rotation.y = t * 0.15;
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.05;

    targetScale.current = isListening ? 1.08 + Math.sin(t * 4) * 0.04 : 1;
    const s = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale.current, 0.05);
    meshRef.current.scale.setScalar(s);

    if (materialRef.current) {
      const pulse = isListening ? 0.6 + Math.sin(t * 3) * 0.4 : 0.3 + Math.sin(t * 1.5) * 0.15;
      materialRef.current.emissiveIntensity = pulse;
    }
  });

  const scale = size / 30;
  const col = new THREE.Color(color);

  const geometryNode = useMemo(() => {
    switch (shape) {
      case "dot":
        return <sphereGeometry args={[0.25 * scale, 24, 24]} />;
      case "polygon":
        return <octahedronGeometry args={[0.45 * scale, 0]} />;
      case "complex":
        return <icosahedronGeometry args={[0.45 * scale, 2]} />;
      case "transcendent":
        return <dodecahedronGeometry args={[0.45 * scale, 1]} />;
      default:
        return <sphereGeometry args={[0.45 * scale, 64, 64]} />;
    }
  }, [shape, scale]);

  return (
    <mesh ref={meshRef}>
      {geometryNode}
      <meshStandardMaterial
        ref={materialRef}
        color={col}
        emissive={col}
        emissiveIntensity={0.3}
        roughness={0.15}
        metalness={0.8}
        transparent
        opacity={opacity}
        envMapIntensity={1.5}
      />
    </mesh>
  );
}

function AmbientParticles({ count, color, size }: {
  count: number; color: string; size: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const particles = useMemo(() => {
    const scale = size / 30;
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const rSeed = seededRandom(i * 3 + 1);
      const ySeed = seededRandom(i * 3 + 2);
      const r = 0.8 * scale + rSeed * 0.4 * scale;
      const yOff = (ySeed - 0.5) * 0.6 * scale;
      return {
        pos: [Math.cos(angle) * r, yOff, Math.sin(angle) * r] as [number, number, number],
        speed: 0.5 + seededRandom(i * 3 + 10) * 0.5,
        size: 0.015 + seededRandom(i * 3 + 20) * 0.025,
        phase: seededRandom(i * 3 + 30) * Math.PI * 2,
      };
    });
  }, [count, size]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <OrbitDot key={i} pos={p.pos} speed={p.speed} dotSize={p.size} color={color} phase={p.phase} />
      ))}
    </group>
  );
}

function OrbitDot({ pos, speed, dotSize, color, phase }: {
  pos: [number, number, number]; speed: number; dotSize: number; color: string; phase: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    meshRef.current.position.y = pos[1] + Math.sin(t) * 0.1;
    const o = 0.3 + Math.sin(t * 1.5) * 0.3;
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = o;
  });

  return (
    <mesh ref={meshRef} position={pos}>
      <sphereGeometry args={[dotSize, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

function GlowRing({ color, size, vitality }: {
  color: string; size: number; vitality: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.elapsedTime;
    ringRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.1;
    ringRef.current.rotation.z = t * 0.08;
    const s = 1 + Math.sin(t * 0.8) * 0.02;
    ringRef.current.scale.setScalar(s);
  });

  const scale = size / 30;
  const col = new THREE.Color(color);

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[0.7 * scale, 0.005, 16, 100]} />
      <meshBasicMaterial color={col} transparent opacity={0.12 * vitality} />
    </mesh>
  );
}

function BackgroundStars({ count = 80 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (seededRandom(i * 3) - 0.5) * 20;
      arr[i * 3 + 1] = (seededRandom(i * 3 + 1) - 0.5) * 20;
      arr[i * 3 + 2] = (seededRandom(i * 3 + 2) - 0.5) * 20;
    }
    return arr;
  }, [count]);

  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.02} transparent opacity={0.15} sizeAttenuation />
    </points>
  );
}

function Scene(props: InnerProps) {
  const opacity = props.opacity ?? Math.max(0.4, props.vitality);

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight color={props.color} intensity={props.glow / 30} position={[0, 2, 3]} />
      <pointLight color={props.color} intensity={props.glow / 80} position={[-3, -1, -2]} />
      <Environment preset="night" />

      <BackgroundStars count={60} />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
        <CoreShape
          shape={props.shape}
          color={props.color}
          size={props.size}
          opacity={opacity}
          isListening={props.isListening}
        />
      </Float>

      <GlowRing color={props.color} size={props.size} vitality={props.vitality} />

      {props.particles > 0 && (
        <AmbientParticles count={props.particles} color={props.color} size={props.size} />
      )}
    </>
  );
}

export function VoidCanvasInner(props: InnerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <fog attach="fog" args={["#000000", 6, 18]} />
      <Scene {...props} />
    </Canvas>
  );
}

export default VoidCanvasInner;
