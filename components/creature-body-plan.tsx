"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import type { BodyStructure } from "@/lib/genome/body-plan";

interface Props {
  structure: BodyStructure;
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
  emissiveIntensity: number;
  activityDim: number;
  vitality: number;
  toonGradient: THREE.DataTexture;
}

/**
 * Renders body structure from continuous parameters.
 * No templates. No categories. DNA numbers in, geometry out.
 */
export const CreatureBodyPlan = React.memo(function CreatureBodyPlan({
  structure: s,
  primaryColor,
  secondaryColor,
  emissiveIntensity: ei,
  activityDim,
  vitality,
  toonGradient: toon,
}: Props) {
  const op = Math.max(0.4, activityDim * 0.85 * Math.max(0.5, vitality));

  const elements = useMemo(() => {
    const els: React.ReactElement[] = [];
    const r = s.coreScale * 0.12; // base segment radius

    // ── BODY SEGMENTS ──
    // segmentCount determines how many connected parts form the body
    const segs = Math.max(1, Math.round(s.segmentCount));
    const spacing = r * 2 * s.segmentSpacing;

    for (let i = 0; i < segs; i++) {
      const t = segs === 1 ? 0.5 : i / (segs - 1); // 0..1 along body
      // Taper: thickest at ~30%, thinning toward ends
      const taper = 1.0 - Math.abs(t - 0.3) * 0.6;
      const segR = r * Math.max(0.25, taper);

      // Position along body axis, oriented by uprightness
      // uprightness > 0: vertical stack, < 0: horizontal chain
      const upright = Math.max(-1, Math.min(1, s.uprightness));
      const yOff = -i * spacing * Math.max(0, upright + 0.5);
      const zOff = -i * spacing * Math.max(0, 0.5 - upright);

      // Flatness: squash Y and stretch X
      const scaleX = 1 + (s.flatness - 1) * 0.3;
      const scaleY = 1 - (s.flatness - 1) * 0.2;

      // Serpentine wave for elongated bodies
      const wave = segs > 3 ? Math.sin(t * Math.PI * 2) * 0.04 * (segs - 3) : 0;

      const color = i % 2 === 0 ? primaryColor : secondaryColor;
      els.push(
        <mesh key={`seg-${i}`} position={[wave, yOff, zOff]} scale={[scaleX, scaleY, 1]}>
          <sphereGeometry args={[segR, 10, 8]} />
          <meshToonMaterial color={color} emissive={color} emissiveIntensity={ei * 0.65} transparent opacity={op * 0.8} gradientMap={toon} />
        </mesh>,
      );
    }

    // ── HEAD ──
    // Separates from body when headSeparation > 0.3
    if (s.headSeparation > 0.3) {
      const headR = r * s.headScale * 1.2;
      const sep = s.headSeparation * r * 2.5;
      const upright = Math.max(-1, Math.min(1, s.uprightness));
      const headY = sep * Math.max(0, upright + 0.3);
      const headZ = sep * Math.max(0, 0.7 - upright);

      // Neck connector
      if (s.headSeparation > 0.5) {
        const neckLen = sep * 0.5;
        const neckAngle = Math.atan2(headZ, headY);
        els.push(
          <mesh key="neck" position={[0, headY * 0.4, headZ * 0.4]} rotation={[neckAngle, 0, 0]}>
            <capsuleGeometry args={[r * 0.2, neckLen, 4, 4]} />
            <meshToonMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.6} gradientMap={toon} />
          </mesh>,
        );
      }

      els.push(
        <mesh key="head" position={[0, headY, headZ]}>
          <sphereGeometry args={[headR, 10, 10]} />
          <meshToonMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={ei * 0.8} transparent opacity={op * 0.85} gradientMap={toon} />
        </mesh>,
      );
    }

    // ── LIMBS ──
    // limbCount determines how many, limbLength/Thickness determine shape
    if (s.limbCount > 0.5) {
      const count = Math.round(s.limbCount);
      const pairs = Math.max(1, Math.ceil(count / 2));
      const limbLen = 0.08 + s.limbLength * 0.15;
      const limbR = 0.012 + s.limbThickness * 0.025;
      const bodyLen = (segs - 1) * spacing;

      for (let p = 0; p < pairs; p++) {
        // Distribute pairs along body based on limbDistribution
        const attachT = pairs === 1
          ? (1 - s.limbDistribution) * 0.8 // single pair: low or mid
          : s.limbDistribution * (p / (pairs - 1)); // multiple: spread
        const upright = Math.max(-1, Math.min(1, s.uprightness));
        const attachY = -attachT * bodyLen * Math.max(0, upright + 0.5);
        const attachZ = -attachT * bodyLen * Math.max(0, 0.5 - upright);

        // Limb angle: upright creatures have legs down, horizontal have legs to sides
        const downAngle = upright > 0.3 ? 0.1 : 0.6;
        const sideOffset = r + limbR;

        // Left limb
        els.push(
          <mesh key={`limb-L-${p}`} position={[-sideOffset, attachY - limbLen * 0.4, attachZ]} rotation={[0, 0, downAngle]}>
            <capsuleGeometry args={[limbR, limbLen, 4, 6]} />
            <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.65} gradientMap={toon} />
          </mesh>,
        );
        // Right limb
        els.push(
          <mesh key={`limb-R-${p}`} position={[sideOffset, attachY - limbLen * 0.4, attachZ]} rotation={[0, 0, -downAngle]}>
            <capsuleGeometry args={[limbR, limbLen, 4, 6]} />
            <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={ei * 0.4} transparent opacity={op * 0.65} gradientMap={toon} />
          </mesh>,
        );

        // For upright creatures with 2+ limb pairs: first pair = arms (shorter, higher angle)
        if (p === 0 && pairs >= 2 && upright > 0.5) {
          // Already placed as legs above — override position to arm-like
          // The first pair becomes arms by being placed higher with outward angle
          els[els.length - 2] = (
            <mesh key={`limb-L-${p}`} position={[-sideOffset * 1.2, attachY + limbLen * 0.2, attachZ]} rotation={[0, 0, 0.35]}>
              <capsuleGeometry args={[limbR * 0.8, limbLen * 0.8, 4, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={ei * 0.45} transparent opacity={op * 0.6} gradientMap={toon} />
            </mesh>
          );
          els[els.length - 1] = (
            <mesh key={`limb-R-${p}`} position={[sideOffset * 1.2, attachY + limbLen * 0.2, attachZ]} rotation={[0, 0, -0.35]}>
              <capsuleGeometry args={[limbR * 0.8, limbLen * 0.8, 4, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={ei * 0.45} transparent opacity={op * 0.6} gradientMap={toon} />
            </mesh>
          );
        }
      }
    }

    // ── WINGS ──
    if (s.wingSpan > 0.3) {
      const wingW = 0.1 * s.wingSpan;
      const wingH = 0.06 * s.wingSpan;
      const wingY = s.wingPosition * spacing * (segs - 1) * 0.3;
      const wingTilt = 0.3 + s.wingSpan * 0.1;

      els.push(
        <mesh key="wing-L" position={[-r * 1.3, wingY, -r * 0.3]} rotation={[0.1, 0.2, wingTilt]}>
          <planeGeometry args={[wingW, wingH]} />
          <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.5} side={THREE.DoubleSide} gradientMap={toon} />
        </mesh>,
        <mesh key="wing-R" position={[r * 1.3, wingY, -r * 0.3]} rotation={[0.1, -0.2, -wingTilt]}>
          <planeGeometry args={[wingW, wingH]} />
          <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.5} side={THREE.DoubleSide} gradientMap={toon} />
        </mesh>,
      );
    }

    // ── TAIL ──
    if (s.tailLength > 0.15) {
      const tailLen = 0.05 + s.tailLength * 0.15;
      const tailR = 0.01 + s.tailThickness * 0.02;
      const bodyEnd = -(segs - 1) * spacing;
      const upright = Math.max(-1, Math.min(1, s.uprightness));
      const tailY = bodyEnd * Math.max(0, upright + 0.5) - tailLen * 0.3;
      const tailZ = bodyEnd * Math.max(0, 0.5 - upright) - tailLen * 0.5;

      els.push(
        <mesh key="tail" position={[0, tailY, tailZ]} rotation={[0.4 - upright * 0.3, 0, 0]}>
          <capsuleGeometry args={[tailR, tailLen, 4, 6]} />
          <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.6} gradientMap={toon} />
        </mesh>,
      );
    }

    // ── BRANCHES ──
    if (s.branchCount > 0.5) {
      const count = Math.round(s.branchCount);
      const bLen = 0.04 + s.branchLength * 0.1;
      const bR = r * 0.3;

      for (let bi = 0; bi < count; bi++) {
        const t = 0.2 + (bi / count) * 0.6;
        const angle = (bi / count) * Math.PI * 2 + bi * 0.8;
        const yPos = -t * spacing * (segs - 1) * Math.max(0, s.uprightness + 0.5);
        const tiltOut = 0.5 + (1 - t) * 0.6;
        const color = bi % 3 === 0 ? primaryColor : secondaryColor;

        els.push(
          <mesh key={`branch-${bi}`} position={[Math.cos(angle) * r * 1.3, yPos, Math.sin(angle) * r * 1.3]} rotation={[Math.sin(angle) * tiltOut, 0, Math.cos(angle) * tiltOut]}>
            <capsuleGeometry args={[bR, bLen, 3, 5]} />
            <meshToonMaterial color={color} emissive={color} emissiveIntensity={ei * 0.5} transparent opacity={op * 0.55} gradientMap={toon} />
          </mesh>,
        );

        // Leaf/node at tip
        if (bLen > 0.05) {
          els.push(
            <mesh key={`leaf-${bi}`} position={[Math.cos(angle) * (r * 1.3 + bLen * 0.6), yPos + bLen * 0.3, Math.sin(angle) * (r * 1.3 + bLen * 0.6)]}>
              <sphereGeometry args={[bR * 1.5, 6, 6]} />
              <meshToonMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={ei * 0.7} transparent opacity={op * 0.45} gradientMap={toon} />
            </mesh>,
          );
        }
      }
    }

    // ── FRAGMENTS ──
    // When fragmentation > 0.3, pieces orbit the core
    if (s.fragmentation > 0.3) {
      const fragCount = Math.round(2 + s.fragmentation * 4);
      const orbitR = r * (2 + s.fragmentation);
      for (let fi = 0; fi < fragCount; fi++) {
        const angle = (fi / fragCount) * Math.PI * 2;
        const yOff = Math.sin(angle * 1.5 + fi) * r * 0.8;
        const fragR = r * (0.2 + Math.sin(fi * 2.1) * 0.1);
        const color = fi % 2 === 0 ? primaryColor : secondaryColor;
        els.push(
          <mesh key={`frag-${fi}`} position={[Math.cos(angle) * orbitR, yOff, Math.sin(angle) * orbitR]}>
            <dodecahedronGeometry args={[fragR, 0]} />
            <meshToonMaterial color={color} emissive={color} emissiveIntensity={ei * 0.6} transparent opacity={op * 0.6} gradientMap={toon} />
          </mesh>,
        );
      }
    }

    return els;
  }, [s, primaryColor, secondaryColor, ei, op, toon]);

  // Center the body vertically
  const totalHeight = (s.segmentCount - 1) * s.coreScale * 0.12 * 2 * s.segmentSpacing;
  const centerY = totalHeight * Math.max(0, s.uprightness) * 0.3;

  return <group position={[0, centerY, 0]}>{elements}</group>;
});
