"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import type { BodyPlanConfig, BodyStructure } from "@/lib/genome/body-plan";

interface BodyPlanMeshProps {
  bodyPlan: BodyPlanConfig;
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
  emissiveIntensity: number;
  activityDim: number;
  vitality: number;
  toonGradient: THREE.DataTexture;
  bodyElongation: number;
}

/**
 * Renders body-plan-specific structural meshes.
 * This adds the skeletal structure (limbs, segments, wings, branches, fragments)
 * that makes each body plan visually distinct. It does NOT replace the core body
 * or appendages — it adds on top.
 */
export const CreatureBodyPlan = React.memo(function CreatureBodyPlan({
  bodyPlan,
  primaryColor,
  secondaryColor,
  emissiveIntensity,
  activityDim,
  vitality,
  toonGradient,
  bodyElongation,
}: BodyPlanMeshProps) {
  const s = bodyPlan.structure;
  const opacity = Math.max(0.4, activityDim * 0.85 * Math.max(0.5, vitality));
  const plan = bodyPlan.primary;

  // Blend factor for secondary plan visual hints
  const blendW = bodyPlan.secondaryWeight;

  const elements = useMemo(() => {
    switch (plan) {
      case "serpentine":
        return <SerpentineBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "bipedal":
        return <BipedalBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "quadruped":
        return <QuadrupedBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "avian":
        return <AvianBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "aquatic":
        return <AquaticBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "insectoid":
        return <InsectoidBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "arboreal":
        return <ArborealBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "humanoid":
        return <HumanoidBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "composite":
        return <CompositeBody s={s} primary={primaryColor} secondary={secondaryColor} ei={emissiveIntensity} op={opacity} toon={toonGradient} />;
      case "amorphous":
      default:
        return null; // existing renderer handles this
    }
  }, [plan, s, primaryColor, secondaryColor, emissiveIntensity, opacity, toonGradient]);

  return <>{elements}</>;
});

// ─── Shared types ────────────────────────────────────────────────────

type PlanProps = {
  s: BodyStructure;
  primary: THREE.Color;
  secondary: THREE.Color;
  ei: number;
  op: number;
  toon: THREE.DataTexture;
};

// ─── Serpentine: elongated chain ─────────────────────────────────────

function SerpentineBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const segments = Math.max(3, Math.min(12, s.partCount));
  const segSize = s.coreScale * 0.18;
  const els: React.ReactElement[] = [];

  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1); // 0..1 along body
    const scale = 1.0 - Math.abs(t - 0.35) * 0.8; // thickest at 35%
    const yOff = -i * segSize * 1.8;
    const zWave = Math.sin(t * Math.PI * 2) * 0.08;
    const color = i % 2 === 0 ? primary : secondary;
    els.push(
      <mesh key={`serp-${i}`} position={[0, yOff, zWave]}>
        <sphereGeometry args={[segSize * Math.max(0.3, scale), 10, 8]} />
        <meshToonMaterial color={color} emissive={color} emissiveIntensity={ei * 0.7} transparent opacity={op * 0.8} gradientMap={toon} />
      </mesh>,
    );
  }

  // Tail fin
  if (s.tailLength > 0.2) {
    const tailY = -segments * segSize * 1.8;
    els.push(
      <mesh key="serp-tail" position={[0, tailY, 0]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[segSize * 0.5, segSize * s.tailLength * 2, 4]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.6} gradientMap={toon} />
      </mesh>,
    );
  }

  return <group position={[0, segments * segSize * 0.9, 0]}>{els}</group>;
}

// ─── Bipedal: upright with arms and legs ─────────────────────────────

function BipedalBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const torsoH = 0.22 * s.aspectRatio;
  const legLen = 0.15 * s.limbLength;
  const armLen = 0.12 * s.limbLength;
  const headR = 0.08 * s.headProminence;
  const limbR = 0.025 * (0.5 + s.limbThickness);

  return (
    <group position={[0, -0.15, 0]}>
      {/* Torso */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.1 * s.coreScale, torsoH, 6, 10]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.6} transparent opacity={op * 0.7} gradientMap={toon} />
      </mesh>
      {/* Head */}
      <mesh position={[0, torsoH * 0.5 + headR + 0.02, 0]}>
        <sphereGeometry args={[headR, 10, 10]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.8} transparent opacity={op * 0.8} gradientMap={toon} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.14, torsoH * 0.2, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[limbR, armLen, 4, 6]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.65} gradientMap={toon} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.14, torsoH * 0.2, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[limbR, armLen, 4, 6]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.65} gradientMap={toon} />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.06, -torsoH * 0.5 - legLen * 0.5, 0]}>
        <capsuleGeometry args={[limbR * 1.3, legLen, 4, 6]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.7} gradientMap={toon} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.06, -torsoH * 0.5 - legLen * 0.5, 0]}>
        <capsuleGeometry args={[limbR * 1.3, legLen, 4, 6]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.7} gradientMap={toon} />
      </mesh>
    </group>
  );
}

// ─── Quadruped: horizontal body with 4 legs ──────────────────────────

function QuadrupedBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const bodyLen = 0.2 * s.aspectRatio;
  const legLen = 0.12 * s.limbLength;
  const legR = 0.025 * (0.5 + s.limbThickness);
  const headR = 0.07 * s.headProminence;

  return (
    <group position={[0, -0.1, 0]} rotation={[0.15, 0, 0]}>
      {/* Horizontal body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.1 * s.coreScale, bodyLen, 6, 10]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.6} transparent opacity={op * 0.7} gradientMap={toon} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.04, bodyLen * 0.5 + headR]}>
        <sphereGeometry args={[headR, 10, 10]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.8} transparent opacity={op * 0.8} gradientMap={toon} />
      </mesh>
      {/* 4 legs */}
      {[
        [-0.08, -0.12, bodyLen * 0.35],
        [0.08, -0.12, bodyLen * 0.35],
        [-0.08, -0.12, -bodyLen * 0.35],
        [0.08, -0.12, -bodyLen * 0.35],
      ].map(([x, y, z], i) => (
        <mesh key={`qleg-${i}`} position={[x, y, z]}>
          <capsuleGeometry args={[legR, legLen, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.65} gradientMap={toon} />
        </mesh>
      ))}
      {/* Tail */}
      {s.tailLength > 0.1 && (
        <mesh position={[0, 0.05, -bodyLen * 0.5 - 0.05]} rotation={[0.5, 0, 0]}>
          <capsuleGeometry args={[0.015, s.tailLength * 0.15, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.6} gradientMap={toon} />
        </mesh>
      )}
    </group>
  );
}

// ─── Avian: small body + large wings ─────────────────────────────────

function AvianBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const wingW = 0.2 * s.wingSpan;
  const wingH = 0.12 * s.wingSpan;
  const headR = 0.06 * s.headProminence;

  return (
    <group position={[0, -0.05, 0]}>
      {/* Compact body */}
      <mesh>
        <sphereGeometry args={[0.1 * s.coreScale, 10, 10]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.7} transparent opacity={op * 0.75} gradientMap={toon} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.12, 0.06]}>
        <sphereGeometry args={[headR, 8, 8]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.8} transparent opacity={op * 0.8} gradientMap={toon} />
      </mesh>
      {/* Left wing */}
      <mesh position={[-0.15, 0.02, -0.02]} rotation={[0.1, 0.2, 0.4]}>
        <planeGeometry args={[wingW, wingH]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.6} transparent opacity={op * 0.55} side={THREE.DoubleSide} gradientMap={toon} />
      </mesh>
      {/* Right wing */}
      <mesh position={[0.15, 0.02, -0.02]} rotation={[0.1, -0.2, -0.4]}>
        <planeGeometry args={[wingW, wingH]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.6} transparent opacity={op * 0.55} side={THREE.DoubleSide} gradientMap={toon} />
      </mesh>
      {/* Tail feathers */}
      {s.tailLength > 0.1 && (
        <mesh position={[0, -0.02, -0.14]} rotation={[0.6, 0, 0]}>
          <planeGeometry args={[0.08, s.tailLength * 0.15]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.5} side={THREE.DoubleSide} gradientMap={toon} />
        </mesh>
      )}
    </group>
  );
}

// ─── Aquatic: flat/streamlined body + fins ───────────────────────────

function AquaticBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const bodyW = 0.16 * s.coreScale;

  return (
    <group position={[0, -0.05, 0]} rotation={[0.1, 0, 0]}>
      {/* Flat body */}
      <mesh scale={[1.3, 0.5, 1.0]}>
        <sphereGeometry args={[bodyW, 12, 10]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.6} transparent opacity={op * 0.7} gradientMap={toon} />
      </mesh>
      {/* Dorsal fin */}
      <mesh position={[0, bodyW * 0.5, -0.02]} rotation={[0.2, 0, 0]}>
        <planeGeometry args={[0.04, 0.1]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.5} side={THREE.DoubleSide} gradientMap={toon} />
      </mesh>
      {/* Side fins */}
      <mesh position={[-bodyW * 1.2, -0.02, 0.02]} rotation={[0, 0, 0.5]}>
        <planeGeometry args={[0.08, 0.05]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.45} side={THREE.DoubleSide} gradientMap={toon} />
      </mesh>
      <mesh position={[bodyW * 1.2, -0.02, 0.02]} rotation={[0, 0, -0.5]}>
        <planeGeometry args={[0.08, 0.05]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.45} side={THREE.DoubleSide} gradientMap={toon} />
      </mesh>
      {/* Tail fin */}
      <mesh position={[0, 0, -bodyW * 1.5]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.1, 0.08]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.5} side={THREE.DoubleSide} gradientMap={toon} />
      </mesh>
    </group>
  );
}

// ─── Insectoid: multi-segment + many thin legs ───────────────────────

function InsectoidBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const segments = Math.max(3, Math.min(8, s.partCount));
  const segR = 0.06 * s.coreScale;
  const legLen = 0.1 * s.limbLength;
  const legR = 0.008 * (1 + s.limbThickness);
  const els: React.ReactElement[] = [];

  // Body segments
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const scale = i === 0 ? 1.2 : (i === segments - 1 ? 0.7 : 1.0 - Math.abs(t - 0.4) * 0.3);
    const zOff = -i * segR * 2.2;
    const color = i === 0 ? primary : (i % 2 === 0 ? primary : secondary);
    els.push(
      <mesh key={`iseg-${i}`} position={[0, 0, zOff]}>
        <sphereGeometry args={[segR * scale, 8, 6]} />
        <meshToonMaterial color={color} emissive={color} emissiveIntensity={ei * 0.6} transparent opacity={op * 0.75} gradientMap={toon} />
      </mesh>,
    );

    // Legs on body segments (not head)
    if (i > 0 && i < segments - 1) {
      const legY = -segR * scale * 0.7;
      els.push(
        <mesh key={`ilegL-${i}`} position={[-segR * 1.1, legY, zOff]} rotation={[0, 0, 0.6]}>
          <capsuleGeometry args={[legR, legLen, 3, 4]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.3} transparent opacity={op * 0.6} gradientMap={toon} />
        </mesh>,
        <mesh key={`ilegR-${i}`} position={[segR * 1.1, legY, zOff]} rotation={[0, 0, -0.6]}>
          <capsuleGeometry args={[legR, legLen, 3, 4]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.3} transparent opacity={op * 0.6} gradientMap={toon} />
        </mesh>,
      );
    }
  }

  // Wings if present
  if (s.wingSpan > 0.3) {
    const wSize = 0.1 * s.wingSpan;
    els.push(
      <mesh key="iwingL" position={[-segR * 1.5, segR * 0.8, -segR * 2]} rotation={[0, 0, 0.3]}>
        <planeGeometry args={[wSize, wSize * 1.5]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.35} side={THREE.DoubleSide} gradientMap={toon} />
      </mesh>,
      <mesh key="iwingR" position={[segR * 1.5, segR * 0.8, -segR * 2]} rotation={[0, 0, -0.3]}>
        <planeGeometry args={[wSize, wSize * 1.5]} />
        <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.35} side={THREE.DoubleSide} gradientMap={toon} />
      </mesh>,
    );
  }

  const totalLen = (segments - 1) * segR * 2.2;
  return <group position={[0, 0.05, totalLen * 0.4]}>{els}</group>;
}

// ─── Arboreal: trunk with branches ───────────────────────────────────

function ArborealBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const trunkH = 0.25 * s.aspectRatio;
  const trunkR = 0.05 * (0.5 + s.limbThickness);
  const branches = Math.max(2, Math.min(8, s.branchCount));
  const els: React.ReactElement[] = [];

  // Trunk
  els.push(
    <mesh key="trunk" position={[0, 0, 0]}>
      <capsuleGeometry args={[trunkR, trunkH, 6, 8]} />
      <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.75} gradientMap={toon} />
    </mesh>,
  );

  // Branches
  for (let i = 0; i < branches; i++) {
    const t = 0.3 + (i / branches) * 0.6; // along trunk
    const angle = (i / branches) * Math.PI * 2 + i * 0.7;
    const yPos = (t - 0.5) * trunkH;
    const branchLen = 0.08 + s.limbLength * 0.08 * (1 - Math.abs(t - 0.7) * 1.2);
    const branchR = trunkR * 0.5;
    const tilt = 0.4 + (1 - t) * 0.8; // lower branches droop more
    const color = i % 3 === 0 ? primary : secondary;

    els.push(
      <mesh key={`branch-${i}`} position={[Math.cos(angle) * trunkR * 1.5, yPos, Math.sin(angle) * trunkR * 1.5]} rotation={[Math.sin(angle) * tilt, 0, Math.cos(angle) * tilt]}>
        <capsuleGeometry args={[branchR, branchLen, 3, 5]} />
        <meshToonMaterial color={color} emissive={color} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.6} gradientMap={toon} />
      </mesh>,
    );

    // Leaf/bloom at branch tip
    if (branchLen > 0.06) {
      const tipX = Math.cos(angle) * (trunkR * 1.5 + branchLen * 0.7);
      const tipZ = Math.sin(angle) * (trunkR * 1.5 + branchLen * 0.7);
      els.push(
        <mesh key={`leaf-${i}`} position={[tipX, yPos + branchLen * 0.3, tipZ]}>
          <sphereGeometry args={[branchR * 1.5, 6, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.8} transparent opacity={op * 0.5} gradientMap={toon} />
        </mesh>,
      );
    }
  }

  return <group position={[0, -trunkH * 0.3, 0]}>{els}</group>;
}

// ─── Humanoid: proportioned body ─────────────────────────────────────

function HumanoidBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const torsoH = 0.18 * s.aspectRatio;
  const legLen = 0.18 * s.limbLength;
  const armLen = 0.15 * s.limbLength;
  const headR = 0.07 * s.headProminence;
  const limbR = 0.02 * (0.5 + s.limbThickness);
  const shoulderW = 0.11;

  return (
    <group position={[0, -0.18, 0]}>
      {/* Torso */}
      <mesh>
        <capsuleGeometry args={[0.08 * s.coreScale, torsoH, 6, 10]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.6} transparent opacity={op * 0.7} gradientMap={toon} />
      </mesh>
      {/* Head */}
      <mesh position={[0, torsoH * 0.5 + headR * 0.8, 0]}>
        <sphereGeometry args={[headR, 10, 10]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.8} transparent opacity={op * 0.85} gradientMap={toon} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, torsoH * 0.45, 0]}>
        <capsuleGeometry args={[limbR * 1.2, 0.03, 4, 4]} />
        <meshToonMaterial color={primary} emissive={primary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.65} gradientMap={toon} />
      </mesh>
      {/* Left arm: upper + forearm */}
      <group position={[-shoulderW, torsoH * 0.3, 0]}>
        <mesh rotation={[0, 0, 0.2]}>
          <capsuleGeometry args={[limbR, armLen * 0.5, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.45} transparent opacity={op * 0.65} gradientMap={toon} />
        </mesh>
        <mesh position={[-armLen * 0.15, -armLen * 0.5, 0]} rotation={[0, 0, 0.1]}>
          <capsuleGeometry args={[limbR * 0.85, armLen * 0.45, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.6} gradientMap={toon} />
        </mesh>
      </group>
      {/* Right arm */}
      <group position={[shoulderW, torsoH * 0.3, 0]}>
        <mesh rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[limbR, armLen * 0.5, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.45} transparent opacity={op * 0.65} gradientMap={toon} />
        </mesh>
        <mesh position={[armLen * 0.15, -armLen * 0.5, 0]} rotation={[0, 0, -0.1]}>
          <capsuleGeometry args={[limbR * 0.85, armLen * 0.45, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.6} gradientMap={toon} />
        </mesh>
      </group>
      {/* Left leg: upper + lower */}
      <group position={[-0.05, -torsoH * 0.5, 0]}>
        <mesh>
          <capsuleGeometry args={[limbR * 1.4, legLen * 0.5, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.7} gradientMap={toon} />
        </mesh>
        <mesh position={[0, -legLen * 0.5, 0]}>
          <capsuleGeometry args={[limbR * 1.2, legLen * 0.45, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.35} transparent opacity={op * 0.65} gradientMap={toon} />
        </mesh>
      </group>
      {/* Right leg */}
      <group position={[0.05, -torsoH * 0.5, 0]}>
        <mesh>
          <capsuleGeometry args={[limbR * 1.4, legLen * 0.5, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.7} gradientMap={toon} />
        </mesh>
        <mesh position={[0, -legLen * 0.5, 0]}>
          <capsuleGeometry args={[limbR * 1.2, legLen * 0.45, 4, 6]} />
          <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.35} transparent opacity={op * 0.65} gradientMap={toon} />
        </mesh>
      </group>
      {/* Wings if high creativity */}
      {s.wingSpan > 0.3 && (
        <>
          <mesh position={[-0.12, torsoH * 0.15, -0.06]} rotation={[0.2, 0.3, 0.5]}>
            <planeGeometry args={[0.15 * s.wingSpan, 0.2 * s.wingSpan]} />
            <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.4} side={THREE.DoubleSide} gradientMap={toon} />
          </mesh>
          <mesh position={[0.12, torsoH * 0.15, -0.06]} rotation={[0.2, -0.3, -0.5]}>
            <planeGeometry args={[0.15 * s.wingSpan, 0.2 * s.wingSpan]} />
            <meshToonMaterial color={secondary} emissive={secondary} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.4} side={THREE.DoubleSide} gradientMap={toon} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Composite: orbiting fragments ───────────────────────────────────

function CompositeBody({ s, primary, secondary, ei, op, toon }: PlanProps) {
  const frags = Math.max(3, Math.min(10, s.fragmentCount));
  const els: React.ReactElement[] = [];
  const orbitR = 0.15 * (1 + s.dispersion);

  for (let i = 0; i < frags; i++) {
    const angle = (i / frags) * Math.PI * 2;
    const yOff = (Math.sin(angle * 2 + i) * 0.1);
    const fragSize = 0.04 + Math.sin(i * 1.7) * 0.02;
    const x = Math.cos(angle) * orbitR;
    const z = Math.sin(angle) * orbitR;
    const color = i % 2 === 0 ? primary : secondary;

    els.push(
      <mesh key={`frag-${i}`} position={[x, yOff, z]}>
        <dodecahedronGeometry args={[fragSize, 0]} />
        <meshToonMaterial color={color} emissive={color} emissiveIntensity={ei * 0.7} transparent opacity={op * 0.65} gradientMap={toon} />
      </mesh>,
    );
  }

  // Core ember
  els.push(
    <mesh key="core">
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color={primary} transparent opacity={op * 0.9} />
    </mesh>,
  );

  return <group>{els}</group>;
}
