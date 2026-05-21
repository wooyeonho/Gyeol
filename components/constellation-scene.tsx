"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ThreeErrorBoundary } from "@/components/three-error-boundary";

type Star = { id: string; content: string; x: number; y: number; z: number };
type Constellation = { name: string; starIds: string[] };

const StarPoint = React.memo(function StarPoint({
  star,
  color,
  highlighted,
  dimmed,
}: {
  star: Star;
  color: string;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = star.y + Math.sin(state.clock.elapsedTime * 0.5 + star.x * 2) * 0.05;
    }
  });
  const opacity = dimmed ? 0.18 : 1;
  const radius = highlighted ? 0.045 : 0.03;
  return (
    <mesh ref={ref} position={[star.x, star.y, star.z]}>
      <sphereGeometry args={[radius, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
});

// Lines connecting the stars in a selected constellation. We connect them in
// the order they appear in starIds (which match_memories already ranks by
// similarity), giving a visual sense of how the theme flows through memories.
function ConstellationLines({
  positions,
  color,
}: {
  positions: Array<[number, number, number]>;
  color: string;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const flat = new Float32Array(positions.flat());
    geo.setAttribute("position", new THREE.BufferAttribute(flat, 3));
    return geo;
  }, [positions]);
  if (positions.length < 2) return null;
  return (
    <primitive
      object={
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }),
        )
      }
    />
  );
}

export default function ConstellationScene({
  stars,
  constellations = [],
  selectedConstellation = null,
  color = "#ffffff",
  backgroundColor = "#0a0a12",
  emptyLabel = "No stars yet. Memories will appear here.",
}: {
  stars: Star[];
  constellations?: Constellation[];
  /** Name of the constellation currently selected. When set, its member stars
   *  are highlighted, non-members are dimmed, and the stars are connected by
   *  a polyline so the cluster reads as an actual constellation. */
  selectedConstellation?: string | null;
  color?: string;
  backgroundColor?: string;
  emptyLabel?: string;
}) {
  const selected = useMemo(
    () => constellations.find((c) => c.name === selectedConstellation) ?? null,
    [constellations, selectedConstellation],
  );
  const selectedSet = useMemo(
    () => new Set(selected?.starIds ?? []),
    [selected],
  );
  const linePositions = useMemo(() => {
    if (!selected) return [] as Array<[number, number, number]>;
    const byId = new Map(stars.map((s) => [s.id, s] as const));
    return selected.starIds
      .map((id) => byId.get(id))
      .filter((s): s is Star => Boolean(s))
      .map((s) => [s.x, s.y, s.z] as [number, number, number]);
  }, [selected, stars]);

  if (stars.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/55 text-sm">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="w-full h-full min-h-[400px]">
      <ThreeErrorBoundary>
        <Canvas camera={{ position: [0, 0, 2], fov: 60 }} gl={{ alpha: true }}>
          <color attach="background" args={[backgroundColor]} />
          <ambientLight intensity={0.3} />
          <pointLight position={[0, 0, 1]} intensity={0.5} color={color} />
          {stars.map((s) => (
            <StarPoint
              key={s.id}
              star={s}
              color={color}
              highlighted={selectedSet.has(s.id)}
              dimmed={selected !== null && !selectedSet.has(s.id)}
            />
          ))}
          {selected && linePositions.length >= 2 && (
            <ConstellationLines positions={linePositions} color={color} />
          )}
          <OrbitControls enableZoom enablePan />
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}
