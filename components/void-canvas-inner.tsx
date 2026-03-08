"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Mesh, InstancedMesh } from "three";
import {
  SphereGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  TorusKnotGeometry,
  Object3D,
} from "three";
import type { VoidCanvasShape, VoidCanvasAnimation } from "./void-canvas";

type InnerProps = {
  shape: VoidCanvasShape;
  color: string;
  size: number;
  glow: number;
  animation: VoidCanvasAnimation;
  particles: number;
  background: string;
  opacity: number;
  isListening: boolean;
  vitality: number;
};

function Core({
  shape,
  color,
  size,
  glow,
  animation,
  isListening,
}: {
  shape: VoidCanvasShape;
  color: string;
  size: number;
  glow: number;
  animation: VoidCanvasAnimation;
  isListening: boolean;
}) {
  const meshRef = useRef<Mesh>(null);
  const geom = useMemo(() => {
    switch (shape) {
      case "dot":
        return new SphereGeometry(size * 0.08, 16, 16);
      case "sphere":
        return new SphereGeometry(size * 0.4, 32, 32);
      case "polygon":
        return new DodecahedronGeometry(size * 0.35, 0);
      case "complex":
        return new IcosahedronGeometry(size * 0.35, 1);
      case "transcendent":
        return new TorusKnotGeometry(size * 0.2, size * 0.08, 64, 8);
      default:
        return new SphereGeometry(size * 0.4, 32, 32);
    }
  }, [shape, size]);

  useFrame((state) => {
    const m = meshRef.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    if (animation === "float") {
      m.position.y = Math.sin(t) * 0.3 * size;
    }
    let s = 1;
    if (animation === "pulse-fast") s = 1 + Math.sin(t * 3) * 0.15;
    else if (animation === "breathe-slow") s = 1 + Math.sin(t * 0.5) * 0.1;
    if (isListening) s *= 1 + Math.sin(t * 4) * 0.08;
    m.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef} geometry={geom}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glow / 100}
        transparent
        opacity={1}
      />
    </mesh>
  );
}

function Particles({ count, size, color }: { count: number; size: number; color: string }) {
  const ref = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);
  const [positions] = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      pos.push([
        (Math.random() - 0.5) * size * 2,
        (Math.random() - 0.5) * size * 2,
        (Math.random() - 0.5) * size * 2,
      ]);
    }
    return [pos];
  }, [count, size]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 0.2;
    positions.forEach((p, i) => {
      const angle = t + i * 0.5;
      dummy.position.set(
        p[0] * Math.cos(angle) - p[2] * Math.sin(angle),
        p[1],
        p[0] * Math.sin(angle) + p[2] * Math.cos(angle)
      );
      dummy.scale.setScalar(0.15 * size);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </instancedMesh>
  );
}

function InvalidateWhenVisible() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let id = 0;
    function tick() {
      if (typeof document !== "undefined" && !document.hidden) invalidate();
      id = requestAnimationFrame(tick);
    }
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [invalidate]);
  return null;
}

function Scene(props: InnerProps) {
  const { size, glow, color, background } = props;
  const bg = useMemo(() => {
    const c = background.startsWith("#") ? background.slice(1) : background;
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return [r, g, b] as [number, number, number];
  }, [background]);

  return (
    <>
      <InvalidateWhenVisible />
      <color attach="background" args={bg} />
      <pointLight position={[0, 0, size]} intensity={glow / 50} color={color} />
      <Core
        shape={props.shape}
        color={props.color}
        size={props.size}
        glow={props.glow}
        animation={props.animation}
        isListening={props.isListening}
      />
      <Particles count={props.particles} size={props.size} color={props.color} />
    </>
  );
}

export default function VoidCanvasInner(props: InnerProps) {
  return (
    <div className="w-full h-full" style={{ background: props.background }}>
      <Canvas
        camera={{ position: [0, 0, props.size * 2], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        frameloop="demand"
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
