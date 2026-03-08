"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Star = { id: string; content: string; x: number; y: number; z: number };

function StarPoint({ star }: { star: Star }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = star.y + Math.sin(state.clock.elapsedTime * 0.5 + star.x * 2) * 0.05;
    }
  });
  return (
    <mesh ref={ref} position={[star.x, star.y, star.z]}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color="#fff" />
    </mesh>
  );
}

export default function ConstellationScene({ stars }: { stars: Star[] }) {
  if (stars.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
        No stars yet. Memories will appear here.
      </div>
    );
  }
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [0, 0, 2], fov: 60 }} gl={{ alpha: true }}>
        <color attach="background" args={["#0a0a12"]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, 1]} intensity={0.5} />
        {stars.map((s) => (
          <StarPoint key={s.id} star={s} />
        ))}
        <OrbitControls enableZoom enablePan />
      </Canvas>
    </div>
  );
}
