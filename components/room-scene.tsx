"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { RoomObject } from "@/lib/room/types";

function ObjectMesh({ obj }: { obj: RoomObject }) {
  const ref = useRef<THREE.Mesh>(null);
  const [x, y, z] = obj.position;
  const [sx, sy, sz] = obj.scale;
  const color = obj.color;

  const geom = useMemo(() => {
    switch (obj.type) {
      case "desk":
        return <boxGeometry args={[1, 0.4, 0.6]} />;
      case "window_rain":
        return <planeGeometry args={[1.2, 1]} />;
      case "book":
        return <boxGeometry args={[0.3, 0.4, 0.05]} />;
      case "speaker":
        return <boxGeometry args={[0.4, 0.6, 0.3]} />;
      case "moon":
        return <sphereGeometry args={[0.4, 16, 16]} />;
      case "chair":
        return <boxGeometry args={[0.5, 0.8, 0.5]} />;
      case "plant":
        return <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />;
      case "lamp":
        return <cylinderGeometry args={[0.15, 0.15, 0.6, 8]} />;
      default:
        return <sphereGeometry args={[0.35, 12, 12]} />;
    }
  }, [obj.type]);

  useFrame((_, delta) => {
    if (ref.current && obj.type === "moon") {
      ref.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <mesh ref={ref} position={[x, y, z]} scale={[sx, sy, sz]}>
      {geom}
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
    </mesh>
  );
}

export default function RoomScene({ objects }: { objects: RoomObject[] }) {
  if (objects.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
        No objects yet. Memories will appear here.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[0, 3, 0]} intensity={0.5} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {objects.map((obj) => (
          <ObjectMesh key={obj.id} obj={obj} />
        ))}
        <OrbitControls enableZoom enablePan maxPolarAngle={Math.PI / 2} />
      </Canvas>
    </div>
  );
}
