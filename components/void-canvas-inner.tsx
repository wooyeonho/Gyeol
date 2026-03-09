"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
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

function CoreShape({
  shape,
  color,
  size,
  opacity,
  isListening,
  vitality,
}: {
  shape: string;
  color: string;
  size: number;
  opacity: number;
  isListening: boolean;
  vitality: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scale = size / 30;
  const baseScale = isListening ? scale * 1.12 : scale;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.15;
    meshRef.current.rotation.y = t * 0.25;
  });

  const getGeometry = () => {
    switch (shape) {
      case "dot":
        return <sphereGeometry args={[0.28 * scale, 24, 24]} />;
      case "polygon":
        return <octahedronGeometry args={[0.5 * scale, 0]} />;
      case "complex":
        return <icosahedronGeometry args={[0.5 * scale, 1]} />;
      case "transcendent":
        return <dodecahedronGeometry args={[0.5 * scale, 0]} />;
      default:
        return <sphereGeometry args={[0.5 * scale, 64, 64]} />;
    }
  };

  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  if (shape === "sphere" || shape === "dot") {
    return (
      <Sphere
        ref={meshRef as React.Ref<THREE.Mesh>}
        args={[
          shape === "dot" ? 0.28 * scale : 0.5 * scale,
          shape === "dot" ? 24 : 64,
          shape === "dot" ? 24 : 64,
        ]}
        scale={isListening ? [baseScale * 1.05, baseScale * 1.05, baseScale * 1.05] : [1, 1, 1]}
      >
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={opacity}
          distort={isListening ? 0.45 : 0.22}
          speed={isListening ? 3 : 1.5}
          roughness={0.1}
          metalness={0.6}
          envMapIntensity={1.2}
        />
      </Sphere>
    );
  }

  return (
    <mesh ref={meshRef} scale={baseScale}>
      {getGeometry()}
      <meshStandardMaterial
        color={colorObj}
        transparent
        opacity={opacity}
        roughness={0.15}
        metalness={0.7}
        wireframe={shape === "complex"}
      />
    </mesh>
  );
}

function ParticleField({
  count,
  color,
  size,
  isListening,
}: {
  count: number;
  color: string;
  size: number;
  isListening: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scale = size / 30;

  const positions = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const spread = 0.15 * Math.sin(i * 2.3);
      const r = (0.8 + Math.abs(spread)) * scale;
      return {
        x: Math.cos(angle) * r,
        y: spread * scale,
        z: Math.sin(angle) * r,
        phase: (i / count) * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.6,
        particleSize: 0.02 + Math.random() * 0.025,
      };
    });
  }, [count, scale]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      state.clock.elapsedTime * (isListening ? 0.45 : 0.18);
    groupRef.current.children.forEach((child, i) => {
      const p = positions[i];
      if (!p) return;
      child.position.y = p.y + Math.sin(state.clock.elapsedTime * p.speed + p.phase) * 0.05 * scale;
    });
  });

  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group ref={groupRef}>
      {positions.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.particleSize, 8, 8]} />
          <meshBasicMaterial color={colorObj} transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function OrbitRing({
  color,
  size,
  tiltX,
  tiltZ,
  speed,
}: {
  color: string;
  size: number;
  tiltX: number;
  tiltZ: number;
  speed: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const scale = size / 30;

  useFrame((state) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = state.clock.elapsedTime * speed;
  });

  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  return (
    <mesh ref={ringRef} rotation={[tiltX, 0, tiltZ]}>
      <torusGeometry args={[0.85 * scale, 0.008 * scale, 8, 64]} />
      <meshBasicMaterial color={colorObj} transparent opacity={0.25} />
    </mesh>
  );
}

function GlowCore({ color, size }: { color: string; size: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scale = size / 30;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const s = (1 + Math.sin(t * 0.8) * 0.08) * scale * 1.6;
    meshRef.current.scale.setScalar(s);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
      0.07 + Math.sin(t * 0.6) * 0.03;
  });

  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color={colorObj} transparent opacity={0.07} />
    </mesh>
  );
}

function Scene(props: InnerProps) {
  const opacity = props.opacity ?? Math.max(0.35, props.vitality);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight color={props.color} intensity={props.glow / 30} position={[2, 2, 2]} />
      <pointLight color={props.color} intensity={props.glow / 60} position={[-2, -1, -2]} />

      <GlowCore color={props.color} size={props.size} />

      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.6}>
        <CoreShape
          shape={props.shape}
          color={props.color}
          size={props.size}
          opacity={opacity}
          isListening={props.isListening}
          vitality={props.vitality}
        />
      </Float>

      {props.particles > 0 && (
        <>
          <ParticleField
            count={props.particles}
            color={props.color}
            size={props.size}
            isListening={props.isListening}
          />
          <OrbitRing
            color={props.color}
            size={props.size}
            tiltX={Math.PI / 5}
            tiltZ={Math.PI / 8}
            speed={0.12}
          />
          {props.particles > 8 && (
            <OrbitRing
              color={props.color}
              size={props.size * 1.1}
              tiltX={-Math.PI / 4}
              tiltZ={Math.PI / 6}
              speed={-0.08}
            />
          )}
        </>
      )}
    </>
  );
}

export function VoidCanvasInner(props: InnerProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

export default VoidCanvasInner;
