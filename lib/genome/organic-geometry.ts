/**
 * Organic Geometry Generator
 *
 * Generates living-looking geometry from structural parameters.
 * Instead of assembling raw primitives (sphere + capsule = robot),
 * this creates a SINGLE continuous mesh with smooth organic transitions.
 *
 * Technique: Start from a high-res sphere, then deform vertices based
 * on body structure parameters. The result is one smooth, organic form
 * that naturally expresses limbs, head, tail, wings as bulges and
 * extensions of a single body — like a real organism.
 */

import * as THREE from "three";
import type { BodyStructure } from "./body-plan";

/** Simplex-like noise for organic surface detail. */
function noise3D(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Generate a single organic mesh from body structure.
 * Returns a BufferGeometry that looks like a living thing.
 */
export function generateOrganicGeometry(
  s: BodyStructure,
  baseRadius: number,
): THREE.BufferGeometry {
  // High-res sphere as starting point
  const detail = 5;
  const geo = new THREE.IcosahedronGeometry(baseRadius, detail);
  const pos = geo.attributes.position.array as Float32Array;
  const count = pos.length / 3;
  const result = new Float32Array(pos.length);

  for (let i = 0; i < count; i++) {
    let x = pos[i * 3];
    let y = pos[i * 3 + 1];
    let z = pos[i * 3 + 2];

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // ── BASE SHAPE: elongation + flatness ──
    const elongFactor = 0.5 + s.elongation * 0.5;
    y *= elongFactor;
    // Flatness: squash Y, expand XZ
    const flatFactor = Math.max(0.3, 1 / Math.sqrt(s.flatness));
    const wideFactor = Math.sqrt(s.flatness);
    x *= wideFactor;
    y *= flatFactor;
    z *= wideFactor;

    // ── UPRIGHTNESS: tilt the body axis ──
    // Positive uprightness keeps vertical, negative rotates forward
    if (s.uprightness < 0.3) {
      const tilt = (0.3 - s.uprightness) * 0.8;
      const newY = y * Math.cos(tilt) - z * Math.sin(tilt);
      const newZ = y * Math.sin(tilt) + z * Math.cos(tilt);
      y = newY;
      z = newZ;
    }

    // ── HEAD BULGE ──
    // Pull top vertices outward and upward to form a head
    if (s.headSeparation > 0.15) {
      const headCenter = baseRadius * elongFactor * 0.85;
      const headDist = Math.sqrt(
        nx * nx * 0.3 + (ny - 0.85) * (ny - 0.85) + nz * nz * 0.3,
      );
      const headInfluence = smoothstep(0.6, 0.1, headDist) * s.headSeparation;
      // Push outward to create head bulge
      const headScale = s.headScale * 0.8;
      x += nx * headInfluence * baseRadius * headScale * 0.4;
      y += headInfluence * baseRadius * headScale * 0.3;
      z += nz * headInfluence * baseRadius * headScale * 0.4;

      // Neck pinch: narrow the area between head and body
      if (s.headSeparation > 0.4) {
        const neckZone = smoothstep(0.2, 0, Math.abs(ny - 0.65)) * s.headSeparation * 0.4;
        x *= 1 - neckZone * 0.4;
        z *= 1 - neckZone * 0.4;
      }
    }

    // ── SEGMENTATION ──
    // Create waist-like pinches along the body to suggest segments
    if (s.segmentCount > 1.5) {
      const segFreq = Math.PI * s.segmentCount / elongFactor;
      const pinch = Math.sin(ny * segFreq * 2) * 0.08 * Math.min(1, (s.segmentCount - 1) * 0.5);
      x *= 1 + pinch;
      z *= 1 + pinch;
    }

    // ── LIMB BUDS ──
    // Create outward bulges where limbs would grow
    if (s.limbCount > 0.3) {
      const limbPairs = Math.max(1, Math.round(s.limbCount / 2));
      const limbSize = s.limbLength * 0.4 + 0.1;

      for (let lp = 0; lp < limbPairs; lp++) {
        // Distribute limbs along body
        const attachY = s.limbDistribution > 0.5
          ? -0.3 + (lp / Math.max(1, limbPairs - 1)) * 0.6 - 0.3
          : -0.3 - lp * 0.25;

        const lateralDist = Math.abs(nx);
        const vertDist = Math.abs(ny - attachY);
        const limbInfluence = smoothstep(0.5, 0.1, vertDist)
          * smoothstep(0.3, 0.7, lateralDist)
          * Math.min(1, s.limbCount - lp * 2);

        // Push outward and slightly down
        const limbPush = limbInfluence * limbSize * baseRadius;
        x += Math.sign(nx) * limbPush;
        y -= limbInfluence * limbSize * baseRadius * 0.15;

        // Limb thickness
        const thickPush = limbInfluence * s.limbThickness * 0.15 * baseRadius;
        z += nz * thickPush * 0.5;
      }
    }

    // ── WING BUDS ──
    if (s.wingSpan > 0.2) {
      const wingY = s.wingPosition * 0.6 - 0.1;
      const wingDist = Math.abs(ny - wingY);
      const wingInfluence = smoothstep(0.3, 0.05, wingDist)
        * smoothstep(0.2, 0.6, Math.abs(nx))
        * s.wingSpan;

      // Extend laterally and flatten
      x += Math.sign(nx) * wingInfluence * baseRadius * 0.8;
      y *= 1 - wingInfluence * 0.3; // flatten wing area
    }

    // ── TAIL EXTENSION ──
    if (s.tailLength > 0.1) {
      const tailDist = Math.sqrt(
        nx * nx * 0.5 + (ny + 0.85) * (ny + 0.85) + (nz + 0.5) * (nz + 0.5) * 0.3,
      );
      const tailInfluence = smoothstep(0.7, 0.1, tailDist) * s.tailLength;
      y -= tailInfluence * baseRadius * 0.6;
      z -= tailInfluence * baseRadius * 0.4;
      // Taper: thin out toward tail tip
      const thinning = tailInfluence * (1 - s.tailThickness) * 0.3;
      x *= 1 - thinning;
    }

    // ── BRANCH BUDS ──
    if (s.branchCount > 0.3) {
      const branches = Math.round(s.branchCount);
      for (let bi = 0; bi < branches; bi++) {
        const bAngle = (bi / branches) * Math.PI * 2 + bi * 0.8;
        const bY = 0.1 + (bi / branches) * 0.5;
        const bDirX = Math.cos(bAngle);
        const bDirZ = Math.sin(bAngle);

        const bDist = Math.sqrt(
          (nx - bDirX * 0.6) ** 2 + (ny - bY) ** 2 + (nz - bDirZ * 0.6) ** 2,
        );
        const bInfluence = smoothstep(0.5, 0.1, bDist) * s.branchLength * 0.5;

        x += bDirX * bInfluence * baseRadius;
        y += bInfluence * baseRadius * 0.2;
        z += bDirZ * bInfluence * baseRadius;
      }
    }

    // ── ORGANIC NOISE ──
    // Add subtle noise for living surface texture
    const noiseScale = 8;
    const noiseAmp = 0.03 * baseRadius * (1 + s.elongation * 0.2);
    const n1 = noise3D(nx * noiseScale, ny * noiseScale, nz * noiseScale);
    const n2 = noise3D(nx * noiseScale * 2.1 + 5, ny * noiseScale * 2.1, nz * noiseScale * 2.1);
    x += nx * n1 * noiseAmp;
    y += ny * n1 * noiseAmp * 0.7;
    z += nz * n2 * noiseAmp;

    // ── SYMMETRY ──
    if (s.symmetry < 0.7) {
      const asymAmp = (0.7 - s.symmetry) * 0.1 * baseRadius;
      const asymNoise = noise3D(nx * 3 + 100, ny * 3, nz * 3);
      x += asymNoise * asymAmp;
      y += noise3D(nx * 3, ny * 3 + 100, nz * 3) * asymAmp * 0.5;
    }

    result[i * 3] = x;
    result[i * 3 + 1] = y;
    result[i * 3 + 2] = z;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(result, 3));
  geo.computeVertexNormals();
  return geo;
}
