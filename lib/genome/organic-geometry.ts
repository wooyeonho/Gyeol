/**
 * Organic Geometry Generator — Multi-Part Creature Mesh
 *
 * Generates visually distinct creatures by assembling separate body parts
 * (head, torso, limbs, tail, wings, branches) from geometric primitives,
 * then merging them into a single BufferGeometry with organic surface noise.
 *
 * Each BodyStructure parameter drives a specific body part, producing
 * creatures that range from simple blobs to complex multi-limbed forms.
 */

import * as THREE from "three";
import type { BodyStructure } from "./body-plan";

// ─── Utility helpers ───────────────────────────────────────────────────────

/** Pseudo-random noise for organic surface detail. */
function noise3D(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Primitive builders ────────────────────────────────────────────────────

/**
 * Create an ellipsoid by scaling an icosphere.
 * Returns non-indexed position array (Float32Array) ready for concat.
 */
function makeEllipsoid(
  rx: number,
  ry: number,
  rz: number,
  detail: number,
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const src = geo.toNonIndexed();
  const pos = src.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] *= rx;
    pos[i + 1] *= ry;
    pos[i + 2] *= rz;
  }
  src.attributes.position.needsUpdate = true;
  return src;
}

/**
 * Create a capsule (cylinder with hemispherical caps) along the Y axis.
 * `halfHeight` is half the cylinder section length, `radius` is the cap radius.
 */
function makeCapsule(
  radius: number,
  halfHeight: number,
  radialSegments: number = 6,
  heightSegments: number = 1,
): THREE.BufferGeometry {
  const totalHeight = halfHeight * 2 + radius * 2;
  const geo = new THREE.CapsuleGeometry(radius, halfHeight * 2, Math.max(2, radialSegments), Math.max(1, heightSegments));
  const src = geo.toNonIndexed();
  return src;
}

/**
 * Create a tapered cylinder along Y axis (bottom radius -> top radius).
 */
function makeTaperedCylinder(
  radiusBottom: number,
  radiusTop: number,
  height: number,
  segments: number = 6,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false);
  const src = geo.toNonIndexed();
  return src;
}

/**
 * Create a flat wing-like shape: a box that is very thin on one axis.
 */
function makeWingPlane(
  width: number,
  height: number,
  thickness: number,
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(width, height, thickness, 3, 2, 1);
  const src = geo.toNonIndexed();
  return src;
}

// ─── Transform helpers ─────────────────────────────────────────────────────

/** Translate all vertices of a non-indexed geometry in place. */
function translateGeo(geo: THREE.BufferGeometry, dx: number, dy: number, dz: number): void {
  const pos = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] += dx;
    pos[i + 1] += dy;
    pos[i + 2] += dz;
  }
  pos.length; // keep TS happy
}

/** Rotate all vertices around Z axis (for tilting limbs outward). */
function rotateGeoZ(geo: THREE.BufferGeometry, angle: number): void {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const pos = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const y = pos[i + 1];
    pos[i] = x * c - y * sn;
    pos[i + 1] = x * sn + y * c;
  }
}

/** Rotate all vertices around X axis. */
function rotateGeoX(geo: THREE.BufferGeometry, angle: number): void {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const pos = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length; i += 3) {
    const y = pos[i + 1];
    const z = pos[i + 2];
    pos[i + 1] = y * c - z * sn;
    pos[i + 2] = y * sn + z * c;
  }
}

/** Rotate all vertices around Y axis. */
function rotateGeoY(geo: THREE.BufferGeometry, angle: number): void {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const pos = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const z = pos[i + 2];
    pos[i] = x * c + z * sn;
    pos[i + 2] = -x * sn + z * c;
  }
}

/** Scale all vertices in place. */
function scaleGeo(geo: THREE.BufferGeometry, sx: number, sy: number, sz: number): void {
  const pos = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] *= sx;
    pos[i + 1] *= sy;
    pos[i + 2] *= sz;
  }
}

// ─── Manual merge ──────────────────────────────────────────────────────────

/**
 * Merge an array of non-indexed BufferGeometries into one.
 * Only merges positions (normals are recomputed at the end).
 */
function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  for (const p of parts) {
    totalVerts += (p.attributes.position.array as Float32Array).length;
  }

  const merged = new Float32Array(totalVerts);
  let offset = 0;
  for (const p of parts) {
    const arr = p.attributes.position.array as Float32Array;
    merged.set(arr, offset);
    offset += arr.length;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(merged, 3));
  return geo;
}

// ─── Organic noise pass ────────────────────────────────────────────────────

/**
 * Apply organic surface noise to all vertices of a merged geometry.
 * Also handles symmetry-breaking asymmetry.
 */
function applyOrganicNoise(
  geo: THREE.BufferGeometry,
  s: BodyStructure,
  baseRadius: number,
): void {
  const pos = geo.attributes.position.array as Float32Array;
  const count = pos.length / 3;
  const noiseScale = 8;
  const noiseAmp = 0.025 * baseRadius * (1 + s.elongation * 0.15);

  for (let i = 0; i < count; i++) {
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Multi-octave noise
    const n1 = noise3D(nx * noiseScale, ny * noiseScale, nz * noiseScale);
    const n2 = noise3D(
      nx * noiseScale * 2.1 + 5,
      ny * noiseScale * 2.1,
      nz * noiseScale * 2.1,
    );

    pos[i * 3] += nx * n1 * noiseAmp;
    pos[i * 3 + 1] += ny * n1 * noiseAmp * 0.7;
    pos[i * 3 + 2] += nz * n2 * noiseAmp;

    // Asymmetry
    if (s.symmetry < 0.7) {
      const asymAmp = (0.7 - s.symmetry) * 0.08 * baseRadius;
      const asymNoise = noise3D(nx * 3 + 100, ny * 3, nz * 3);
      pos[i * 3] += asymNoise * asymAmp;
      pos[i * 3 + 1] += noise3D(nx * 3, ny * 3 + 100, nz * 3) * asymAmp * 0.5;
    }
  }

  pos.length; // TS
}

// ─── Uprightness tilt ──────────────────────────────────────────────────────

/** Tilt the whole creature forward when uprightness is low. */
function applyUprightnessTilt(geo: THREE.BufferGeometry, s: BodyStructure): void {
  if (s.uprightness < 0.3) {
    const tilt = (0.3 - s.uprightness) * 0.8;
    rotateGeoX(geo, tilt);
  }
}

// ─── Main export ───────────────────────────────────────────────────────────

/**
 * Generate a multi-part organic mesh from body structure.
 * Returns a single merged BufferGeometry with correct normals.
 */
export function generateOrganicGeometry(
  s: BodyStructure,
  baseRadius: number,
): THREE.BufferGeometry {
  const r = baseRadius * s.coreScale;
  const parts: THREE.BufferGeometry[] = [];

  // Detail level for spheres: lower for perf, still smooth
  const sphereDetail = 4;

  // ── 1. BODY CORE (torso) ──────────────────────────────────────────────
  {
    const elongFactor = 0.5 + s.elongation * 0.4;
    const flatFactor = Math.max(0.35, 1 / Math.sqrt(s.flatness));
    const wideFactor = Math.sqrt(s.flatness);

    const bodyRx = r * wideFactor * 0.85;
    const bodyRy = r * elongFactor * flatFactor * 0.85;
    const bodyRz = r * wideFactor * 0.85;

    const body = makeEllipsoid(bodyRx, bodyRy, bodyRz, sphereDetail);

    // Segmentation: pinch at intervals to create waist/segments
    if (s.segmentCount > 1.5) {
      const pos = body.attributes.position.array as Float32Array;
      const segFreq = Math.PI * s.segmentCount / elongFactor;
      const pinchStrength = Math.min(1, (s.segmentCount - 1) * 0.5) * 0.12;
      for (let i = 0; i < pos.length; i += 3) {
        const y = pos[i + 1];
        const normalizedY = y / bodyRy; // -1..1
        const pinch = Math.sin(normalizedY * segFreq * 2) * pinchStrength;
        pos[i] *= 1 + pinch;
        pos[i + 2] *= 1 + pinch;
      }
    }

    parts.push(body);
  }

  // ── 2. HEAD ───────────────────────────────────────────────────────────
  {
    const elongFactor = 0.5 + s.elongation * 0.4;
    const flatFactor = Math.max(0.35, 1 / Math.sqrt(s.flatness));

    const bodyTopY = r * elongFactor * flatFactor * 0.85;

    const headR = r * s.headScale * 0.55;
    // Head separation: gap between body top and head bottom
    const separation = s.headSeparation * r * 0.3;
    const headY = bodyTopY + separation + headR * 0.5;

    const head = makeEllipsoid(headR, headR * 0.9, headR, sphereDetail);
    translateGeo(head, 0, headY, 0);

    parts.push(head);

    // Neck connector: a small tapered cylinder bridging body to head
    if (s.headSeparation > 0.1) {
      const neckR = headR * clamp(0.3 + (1 - s.headSeparation) * 0.4, 0.15, 0.6);
      const neckHeight = Math.max(0.01, separation + headR * 0.3);
      const neck = makeTaperedCylinder(
        neckR * 1.2,     // wider at body
        neckR * 0.8,     // narrower at head
        neckHeight,
        5,
      );
      translateGeo(neck, 0, bodyTopY + neckHeight * 0.4, 0);
      parts.push(neck);
    }
  }

  // ── 3. LIMBS ──────────────────────────────────────────────────────────
  if (s.limbCount > 0.3) {
    const limbPairs = Math.max(1, Math.round(s.limbCount / 2));
    const actualPairs = Math.min(limbPairs, 6); // cap for sanity

    const elongFactor = 0.5 + s.elongation * 0.4;
    const flatFactor = Math.max(0.35, 1 / Math.sqrt(s.flatness));
    const wideFactor = Math.sqrt(s.flatness);

    const bodyRx = r * wideFactor * 0.85;
    const bodyRy = r * elongFactor * flatFactor * 0.85;

    const limbRadius = r * s.limbThickness * 0.18 + r * 0.04;
    const limbHalfLen = r * s.limbLength * 0.5 + r * 0.08;

    for (let lp = 0; lp < actualPairs; lp++) {
      // Fade strength for fractional limb counts
      const limbStrength = clamp(s.limbCount - lp * 2, 0, 1);
      if (limbStrength < 0.1) break;

      // Vertical attach point along body
      let attachY: number;
      if (s.limbDistribution > 0.5) {
        // Distributed evenly along body
        attachY = bodyRy * (0.4 - (lp / Math.max(1, actualPairs - 1)) * 0.8);
      } else {
        // Clustered at bottom
        attachY = -bodyRy * 0.2 - lp * bodyRy * 0.35;
      }
      attachY = clamp(attachY, -bodyRy * 0.9, bodyRy * 0.7);

      const thisLimbRadius = limbRadius * limbStrength;
      const thisLimbHalfLen = limbHalfLen * limbStrength;

      // Two mirrored limbs per pair
      for (const side of [-1, 1] as const) {
        const limb = makeCapsule(thisLimbRadius, thisLimbHalfLen, 5, 1);

        // Rotate to point outward and slightly down
        rotateGeoZ(limb, side * (Math.PI * 0.35 + s.limbLength * 0.15));

        // Position at body surface
        const attachX = side * (bodyRx * 0.85);
        translateGeo(limb, attachX, attachY, 0);

        parts.push(limb);
      }
    }
  }

  // ── 4. TAIL ───────────────────────────────────────────────────────────
  if (s.tailLength > 0.1) {
    const elongFactor = 0.5 + s.elongation * 0.4;
    const flatFactor = Math.max(0.35, 1 / Math.sqrt(s.flatness));
    const bodyRy = r * elongFactor * flatFactor * 0.85;

    const tailLen = r * s.tailLength * 0.8 + r * 0.1;
    const tailBaseR = r * s.tailThickness * 0.15 + r * 0.03;
    const tailTipR = tailBaseR * 0.15;

    // Build tail from 3 tapered segments for a curved look
    const segments = 3;
    const segLen = tailLen / segments;
    let curY = -bodyRy * 0.85;
    let curZ = 0;
    let curR = tailBaseR;

    for (let ti = 0; ti < segments; ti++) {
      const nextR = tailBaseR * (1 - (ti + 1) / segments) + tailTipR * ((ti + 1) / segments);
      const seg = makeTaperedCylinder(curR, nextR, segLen, 5);

      // Tilt each segment slightly backward
      const tiltAngle = (ti + 1) * 0.25;
      rotateGeoX(seg, tiltAngle);

      // Position: chain segments
      const offsetY = -segLen * 0.5 * Math.cos(tiltAngle);
      const offsetZ = -segLen * 0.5 * Math.sin(tiltAngle);
      translateGeo(seg, 0, curY + offsetY, curZ + offsetZ);

      curY += -segLen * Math.cos(tiltAngle);
      curZ += -segLen * Math.sin(tiltAngle);
      curR = nextR;

      parts.push(seg);
    }
  }

  // ── 5. WINGS ──────────────────────────────────────────────────────────
  if (s.wingSpan > 0.2) {
    const elongFactor = 0.5 + s.elongation * 0.4;
    const flatFactor = Math.max(0.35, 1 / Math.sqrt(s.flatness));
    const wideFactor = Math.sqrt(s.flatness);
    const bodyRx = r * wideFactor * 0.85;
    const bodyRy = r * elongFactor * flatFactor * 0.85;

    const wingWidth = r * s.wingSpan * 0.9;
    const wingHeight = r * 0.5 + r * s.wingSpan * 0.2;
    const wingThick = r * 0.04;

    const wingY = bodyRy * (s.wingPosition * 0.8 - 0.1);

    for (const side of [-1, 1] as const) {
      const wing = makeWingPlane(wingWidth, wingHeight, wingThick);

      // Taper the wing: vertices farther from body get scaled down in Y
      const wpos = wing.attributes.position.array as Float32Array;
      for (let i = 0; i < wpos.length; i += 3) {
        const localX = wpos[i]; // wing local X
        const distFromRoot = Math.abs(localX) / (wingWidth * 0.5);
        // Taper height toward tip
        wpos[i + 1] *= 1 - distFromRoot * 0.5;
        // Slight droop
        wpos[i + 1] -= distFromRoot * distFromRoot * wingHeight * 0.15;
      }

      // Tilt wings slightly up
      rotateGeoZ(wing, side * 0.2);

      // Position beside body
      translateGeo(wing, side * (bodyRx + wingWidth * 0.45), wingY, 0);

      parts.push(wing);
    }
  }

  // ── 6. BRANCHES ───────────────────────────────────────────────────────
  if (s.branchCount > 0.3) {
    const branches = Math.min(6, Math.round(s.branchCount));
    const elongFactor = 0.5 + s.elongation * 0.4;
    const flatFactor = Math.max(0.35, 1 / Math.sqrt(s.flatness));
    const bodyRy = r * elongFactor * flatFactor * 0.85;

    const branchLen = r * s.branchLength * 0.6 + r * 0.08;
    const branchR = r * 0.04 + r * s.branchLength * 0.02;

    for (let bi = 0; bi < branches; bi++) {
      const angle = (bi / branches) * Math.PI * 2 + bi * 0.8;
      const attachY = bodyRy * (0.1 + (bi / branches) * 0.6);

      const branch = makeCapsule(branchR, branchLen * 0.5, 4, 1);

      // Angle outward and upward
      rotateGeoZ(branch, -Math.cos(angle) * 0.6);
      rotateGeoX(branch, Math.sin(angle) * 0.6);
      rotateGeoY(branch, angle);

      translateGeo(
        branch,
        Math.cos(angle) * r * 0.6,
        attachY,
        Math.sin(angle) * r * 0.6,
      );

      parts.push(branch);
    }
  }

  // ── 7. FRAGMENTATION (orbiting pieces) ────────────────────────────────
  if (s.fragmentation > 0.2) {
    const fragCount = Math.min(8, Math.round(s.fragmentation * 4));
    const fragSize = r * 0.12 + r * s.fragmentation * 0.06;

    for (let fi = 0; fi < fragCount; fi++) {
      const fAngle = (fi / fragCount) * Math.PI * 2;
      const fY = (noise3D(fi * 7.3, 0, 0) * 0.5) * r;
      const fDist = r * (1.2 + s.fragmentation * 0.4);

      const frag = makeEllipsoid(
        fragSize * (0.6 + Math.abs(noise3D(fi * 3.1, 0, 0)) * 0.6),
        fragSize * (0.5 + Math.abs(noise3D(0, fi * 3.1, 0)) * 0.5),
        fragSize * (0.6 + Math.abs(noise3D(0, 0, fi * 3.1)) * 0.6),
        2,
      );

      translateGeo(
        frag,
        Math.cos(fAngle) * fDist,
        fY,
        Math.sin(fAngle) * fDist,
      );

      parts.push(frag);
    }
  }

  // ── MERGE ALL PARTS ───────────────────────────────────────────────────
  const merged = mergeGeometries(parts);

  // Dispose source geometries
  for (const p of parts) p.dispose();

  // ── POST-PROCESSING ───────────────────────────────────────────────────

  // Apply uprightness tilt
  applyUprightnessTilt(merged, s);

  // Apply organic surface noise + asymmetry
  applyOrganicNoise(merged, s, baseRadius);

  // Recompute normals for correct lighting
  merged.computeVertexNormals();

  return merged;
}
