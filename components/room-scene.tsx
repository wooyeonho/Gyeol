"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { RoomObject } from "@/lib/room/types";
import { ThreeErrorBoundary } from "@/components/three-error-boundary";

function ObjectMesh({ obj, accentColor }: { obj: RoomObject; accentColor: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const [x, y, z] = obj.position;
  const [sx, sy, sz] = obj.scale;
  const color = obj.color || accentColor;

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

export default function RoomScene({
  objects,
  accentColor = "#8b5cf6",
  backgroundColor = "#07070f",
  emptyLabel = "No objects yet. Memories will appear here.",
}: {
  objects: RoomObject[];
  accentColor?: string;
  backgroundColor?: string;
  emptyLabel?: string;
}) {
  if (objects.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/55 text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="gpu-layer w-full h-full min-h-[400px]">
      <ThreeErrorBoundary>
        <Canvas camera={{ position: [0, 2, 5], fov: 50 }} gl={{ antialias: true }}>
          <color attach="background" args={[backgroundColor]} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} color={accentColor} />
          <pointLight position={[0, 3, 0]} intensity={0.55} color={accentColor} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#14141c" emissive={accentColor} emissiveIntensity={0.05} />
          </mesh>
          {objects.map((obj) => (
            <ObjectMesh key={obj.id} obj={obj} accentColor={accentColor} />
          ))}
          <OrbitControls enableZoom enablePan maxPolarAngle={Math.PI / 2} />
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}
