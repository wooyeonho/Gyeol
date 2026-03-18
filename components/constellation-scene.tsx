"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ThreeErrorBoundary } from "@/components/three-error-boundary";

type Star = { id: string; content: string; x: number; y: number; z: number };

const StarPoint = React.memo(function StarPoint({ star, color }: { star: Star; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = star.y + Math.sin(state.clock.elapsedTime * 0.5 + star.x * 2) * 0.05;
    }
  });
  return (
    <mesh ref={ref} position={[star.x, star.y, star.z]}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
});

export default function ConstellationScene({
  stars,
  color = "#ffffff",
  backgroundColor = "#0a0a12",
  emptyLabel = "No stars yet. Memories will appear here.",
}: {
  stars: Star[];
  color?: string;
  backgroundColor?: string;
  emptyLabel?: string;
}) {
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
            <StarPoint key={s.id} star={s} color={color} />
          ))}
          <OrbitControls enableZoom enablePan />
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}
