"use client";

/**
 * CreatureViewer — Living 3D creature interaction surface.
 *
 * Built on top of ProceduralCreature (R3F), this wrapper adds:
 *  1. Idle "breathing" animation — gentle scale oscillation when calm.
 *  2. Petting interaction — tap/click the head zone to trigger:
 *       • Eye-close happy expression (via isEating-style prop)
 *       • R3F heart particle burst (HeartParticles)
 *       • Haptic "heartbeat" pattern
 *       • Visual scale-bounce fallback for desktop
 *  3. Mood emoji overlay above the 3D canvas (HTML layer).
 *  4. Reduced-motion aware — particles & oscillations skip when preferred.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";
import { haptic, playSound } from "@/lib/micro-interactions";
import type { CreatureDNA } from "@/lib/genome/dna";
import type { SpeciesProfile } from "@/lib/genome/species";
import { ProceduralCreature } from "@/components/procedural-creature";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreatureViewerProps {
  dna: CreatureDNA;
  species: SpeciesProfile;
  mood?: string | null;
  vitality?: number;
  /** 0–100 energy — drives idle animation intensity */
  energy?: number;
  /** Pass true when feeding item is dragged onto the canvas */
  isEating?: boolean;
  /** Called after petting interaction fires */
  onPet?: () => void;
  /** Called after feeding animation completes */
  onFed?: () => void;
  className?: string;
  /** Height class for the canvas container (default: h-64) */
  heightClass?: string;
  locale?: string;
}

// ── Heart Particle System (R3F) ────────────────────────────────────────────

const HEART_COUNT = 18;

/**
 * Bursts heart-shaped sprites upward from the creature when `active` is true.
 * Uses point sprites with a canvas-generated heart texture.
 */
function HeartParticles({ active }: { active: boolean }) {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const posRef = useRef<THREE.BufferAttribute | null>(null);
  const velRef = useRef(new Float32Array(HEART_COUNT * 3));
  const ageRef = useRef(new Float32Array(HEART_COUNT));
  const opacRef = useRef<THREE.PointsMaterial | null>(null);
  const activeRef = useRef(false);

  // Canvas-generated heart texture (no asset dependency)
  const heartTex = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ff4f8b";
    ctx.beginPath();
    const x = size / 2;
    const y = size / 2 - 4;
    const r = size / 4;
    ctx.moveTo(x, y + r);
    ctx.bezierCurveTo(x, y, x - r * 2, y, x - r * 2, y + r);
    ctx.bezierCurveTo(x - r * 2, y + r * 1.6, x, y + r * 2.2, x, y + r * 2.8);
    ctx.bezierCurveTo(x, y + r * 2.2, x + r * 2, y + r * 1.6, x + r * 2, y + r);
    ctx.bezierCurveTo(x + r * 2, y, x, y, x, y + r);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Spawn velocities — reset on each activation
  const spawnBurst = useCallback(() => {
    if (!posRef.current) return;
    const arr = posRef.current.array as Float32Array;
    for (let i = 0; i < HEART_COUNT; i++) {
      // Spawn in a dome above the creature's head
      const theta = (Math.random() * Math.PI * 2);
      const r = Math.random() * 0.4;
      arr[i * 3]     = Math.cos(theta) * r;
      arr[i * 3 + 1] = 0.6 + Math.random() * 0.3;
      arr[i * 3 + 2] = Math.sin(theta) * r;
      velRef.current[i * 3]     = (Math.random() - 0.5) * 0.006;
      velRef.current[i * 3 + 1] = 0.012 + Math.random() * 0.018;
      velRef.current[i * 3 + 2] = (Math.random() - 0.5) * 0.006;
      ageRef.current[i] = Math.random() * 0.3; // stagger ages
    }
    posRef.current.needsUpdate = true;
  }, []);

  useEffect(() => {
    if (active && !activeRef.current) {
      activeRef.current = true;
      spawnBurst();
    } else if (!active) {
      activeRef.current = false;
    }
  }, [active, spawnBurst]);

  useFrame((_, dt) => {
    if (!posRef.current || !opacRef.current) return;
    if (!activeRef.current) {
      // Fade out remaining particles
      opacRef.current.opacity = Math.max(0, opacRef.current.opacity - dt * 2);
      return;
    }
    opacRef.current.opacity = 1;
    const arr = posRef.current.array as Float32Array;
    for (let i = 0; i < HEART_COUNT; i++) {
      ageRef.current[i] += dt;
      if (ageRef.current[i] > 1.4) {
        // Respawn at head
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.35;
        arr[i * 3]     = Math.cos(theta) * r;
        arr[i * 3 + 1] = 0.5 + Math.random() * 0.25;
        arr[i * 3 + 2] = Math.sin(theta) * r;
        velRef.current[i * 3]     = (Math.random() - 0.5) * 0.005;
        velRef.current[i * 3 + 1] = 0.01 + Math.random() * 0.015;
        velRef.current[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
        ageRef.current[i] = 0;
      } else {
        arr[i * 3]     += velRef.current[i * 3];
        arr[i * 3 + 1] += velRef.current[i * 3 + 1];
        arr[i * 3 + 2] += velRef.current[i * 3 + 2];
        // Slow drift down gradually
        velRef.current[i * 3 + 1] -= dt * 0.003;
      }
    }
    posRef.current.needsUpdate = true;
  });

  const initPositions = useMemo(() => new Float32Array(HEART_COUNT * 3), []);

  return (
    <points>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          ref={posRef}
          attach="attributes-position"
          args={[initPositions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={opacRef}
        map={heartTex}
        size={0.12}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        alphaTest={0.05}
      />
    </points>
  );
}

// ── Idle Breath Animation ──────────────────────────────────────────────────

/**
 * Applies a gentle sinusoidal scale to the group while idle.
 * Intensity scales with creature energy (low energy = slower breath).
 */
function IdleBreath({
  groupRef,
  energy,
  active,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  energy: number;
  active: boolean;
}) {
  const timeRef = useRef(0);

  useFrame((_, dt) => {
    if (!groupRef.current || !active) return;
    timeRef.current += dt;
    const freq = 0.4 + energy * 0.003; // ~0.4–0.7 Hz
    const amp  = 0.018 + energy * 0.0002; // ~0.018–0.038
    const s = 1 + Math.sin(timeRef.current * freq * Math.PI * 2) * amp;
    groupRef.current.scale.setScalar(s);
  });

  return null;
}

// ── Head Hit-Test Plane (invisible) ───────────────────────────────────────

/**
 * Invisible sphere at the head zone — catches raycaster events for petting.
 */
function HeadHitZone({ onPet }: { onPet: () => void }) {
  return (
    <mesh
      position={[0, 0.5, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onPet();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <sphereGeometry args={[0.55, 8, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// ── Scene (everything inside the Canvas) ──────────────────────────────────

function CreatureScene({
  dna,
  species,
  mood,
  vitality,
  energy,
  isEating,
  isPetting,
  onPet,
  reducedMotion,
}: {
  dna: CreatureDNA;
  species: SpeciesProfile;
  mood?: string | null;
  vitality?: number;
  energy: number;
  isEating?: boolean;
  isPetting: boolean;
  onPet: () => void;
  reducedMotion: boolean | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Centre camera
  useEffect(() => {
    camera.position.set(0, 0, 3.5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.2} castShadow={false} />
      <pointLight position={[-2, 2, -1]} intensity={0.4} color="#a78bfa" />

      <group ref={groupRef}>
        <ProceduralCreature
          dna={dna}
          species={species}
          mood={mood}
          vitality={vitality}
          isEating={isEating || isPetting}
          conversationEnergy={energy / 100}
        />

        {/* Invisible head zone for petting */}
        <HeadHitZone onPet={onPet} />

        {/* Heart particles burst on petting */}
        {!reducedMotion && <HeartParticles active={isPetting} />}
      </group>

      {/* Idle breath (skipped in reduced-motion) */}
      {!reducedMotion && (
        <IdleBreath groupRef={groupRef} energy={energy} active={!isPetting} />
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  loved: "🥰",
  hungry: "😋",
  tired: "😴",
  bored: "😑",
  excited: "🤩",
  sad: "😢",
  neutral: "😐",
  content: "🙂",
  anxious: "😰",
  playful: "😝",
};

const PET_DURATION_MS = 2000;

export function CreatureViewer({
  dna,
  species,
  mood,
  vitality = 1,
  energy = 75,
  isEating = false,
  onPet,
  onFed,
  className = "",
  heightClass = "h-64",
  locale = "ko",
}: CreatureViewerProps) {
  const reducedMotion = useReducedMotion();
  const [isPetting, setIsPetting] = useState(false);
  const [petScale, setPetScale] = useState(1);
  const petTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isKo = locale === "ko";

  // Previous isEating — fire onFed when feeding ends
  const prevEatingRef = useRef(isEating);
  useEffect(() => {
    if (prevEatingRef.current && !isEating) {
      feedTimerRef.current = setTimeout(() => onFed?.(), 500);
    }
    prevEatingRef.current = isEating;
    return () => { if (feedTimerRef.current) clearTimeout(feedTimerRef.current); };
  }, [isEating, onFed]);

  const handlePet = useCallback(() => {
    if (isPetting) return;
    setIsPetting(true);
    setPetScale(1.08);

    // Haptic "heartbeat" pattern
    haptic("care");
    setTimeout(() => haptic("tap"), 300);

    // Play a gentle sound
    playSound("receive");

    onPet?.();

    if (petTimerRef.current) clearTimeout(petTimerRef.current);
    petTimerRef.current = setTimeout(() => {
      setIsPetting(false);
      setPetScale(1);
    }, PET_DURATION_MS);
  }, [isPetting, onPet]);

  useEffect(() => {
    return () => { if (petTimerRef.current) clearTimeout(petTimerRef.current); };
  }, []);

  const moodEmoji = MOOD_EMOJI[mood ?? ""] ?? "😐";

  return (
    <div
      className={`relative select-none overflow-hidden rounded-2xl ${heightClass} ${className}`}
      aria-label={isKo ? "피조물 3D 뷰어" : "Creature 3D viewer"}
      role="img"
    >
      {/* Floating mood emoji overlay (HTML layer — no R3F DOM issues) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center"
        aria-hidden="true"
      >
        <div
          key={mood}
          className="animate-bounce-slow flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur-sm"
          style={{
            animation: reducedMotion ? "none" : "moodFloat 3s ease-in-out infinite",
          }}
        >
          <span className="text-lg">{moodEmoji}</span>
          <span className="text-[10px] text-white/60">
            {isKo ? "현재 기분" : "mood"}
          </span>
        </div>
      </div>

      {/* Pet hint (shown briefly when petting) */}
      {isPetting && (
        <div
          className="pointer-events-none absolute inset-x-0 top-12 z-10 flex justify-center"
          aria-live="polite"
          aria-label={isKo ? "쓰다듬는 중" : "Petting"}
        >
          <div className="flex items-center gap-1 rounded-full bg-pink-500/20 px-3 py-1 text-[11px] text-pink-300 backdrop-blur-sm">
            ❤️ {isKo ? "기분 좋아!" : "Loves it!"}
          </div>
        </div>
      )}

      {/* Tap-to-pet instruction (shown when idle) */}
      {!isPetting && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center opacity-60"
          aria-hidden="true"
        >
          <span className="text-[10px] text-white/40">
            {isKo ? "머리를 탭해서 쓰다듬어 주세요" : "Tap head to pet"}
          </span>
        </div>
      )}

      {/* R3F Canvas */}
      <div
        style={{
          transform: reducedMotion ? "none" : `scale(${petScale})`,
          transition: "transform 0.15s cubic-bezier(0.16,1,0.3,1)",
          width: "100%",
          height: "100%",
        }}
      >
        <Canvas
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          style={{ background: "transparent" }}
          aria-hidden="true"
        >
          <CreatureScene
            dna={dna}
            species={species}
            mood={mood}
            vitality={vitality}
            energy={energy}
            isEating={isEating}
            isPetting={isPetting}
            onPet={handlePet}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>

      {/* Inline keyframes for mood float (avoids adding to globals.css) */}
      <style>{`
        @keyframes moodFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
