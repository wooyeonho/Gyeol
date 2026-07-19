"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback, useEffect, useRef, useMemo } from "react";
import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

/* ================================================================
 *  PixelCreature — Fully procedural pixel-art creature generator
 *
 *  Every creature is 100% unique, generated from DNA fields.
 *  NO fixed templates — all shapes are algorithmically grown.
 *
 *  Style: Pokemon Game Boy Color era
 *  - Black pixel outline, 3-4 color limited palette
 *  - Mirrored left-right symmetry
 *  - 2-frame idle bob at 12fps
 *  - Random blink, tap-to-bounce
 * ================================================================ */

type PresenceSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<PresenceSize, number> = { sm: 56, md: 80, lg: 112 };
const GRID = 24;

// ── Deterministic seeded RNG (FNV-1a based) ──
function createRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

// ── Color helpers ──
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length < 6) return [120, 120, 160];
  return [
    parseInt(h.slice(0, 2), 16) || 80,
    parseInt(h.slice(2, 4), 16) || 80,
    parseInt(h.slice(4, 6), 16) || 120,
  ];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function rgbStr(r: number, g: number, b: number, a = 1) {
  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

/** Build a 4-color Pokemon-style palette from DNA hex colors. */
function buildPalette(primary: string, secondary: string) {
  const [pr, pg, pb] = hexToRgb(primary);
  const [sr, sg, sb] = hexToRgb(secondary);
  const [h, s, l] = rgbToHsl(pr, pg, pb);

  // Shadow: darker, slightly more saturated
  const [shr, shg, shb] = hslToRgb(h, Math.min(100, s + 10), Math.max(10, l - 22));
  // Highlight: lighter, slightly desaturated
  const [hlr, hlg, hlb] = hslToRgb(h, Math.max(0, s - 8), Math.min(90, l + 20));

  return {
    outline: rgbStr(16, 16, 24),
    shadow: rgbStr(shr, shg, shb),
    main: rgbStr(pr, pg, pb),
    light: rgbStr(hlr, hlg, hlb),
    accent: rgbStr(sr, sg, sb),
    accentDark: rgbStr(
      Math.max(0, sr - 40),
      Math.max(0, sg - 40),
      Math.max(0, sb - 40),
    ),
    eyeWhite: rgbStr(242, 242, 248),
    eyePupil: rgbStr(18, 18, 28),
    blush: rgbStr(
      Math.min(255, sr + 60),
      Math.max(0, sg - 20),
      Math.max(0, sb - 10),
      0.7,
    ),
  };
}

// ── Cell types: 0=empty 1=outline 2=shadow 3=main 4=highlight 5=accent 6=eyeWhite 7=eyePupil 8=mouth 9=blush 10=accentDark ──
type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

function setCell(grid: Cell[][], x: number, y: number, v: Cell) {
  if (x >= 0 && x < GRID && y >= 0 && y < GRID) grid[y][x] = v;
}

/** Set cell only if currently empty */
function setIfEmpty(grid: Cell[][], x: number, y: number, v: Cell) {
  if (x >= 0 && x < GRID && y >= 0 && y < GRID && grid[y][x] === 0) {
    grid[y][x] = v;
  }
}

/** Set cell, mirrored around midX */
function setMirrored(grid: Cell[][], midX: number, dx: number, y: number, v: Cell) {
  setCell(grid, midX - dx, y, v);
  setCell(grid, midX + dx - 1, y, v);
}

function setMirroredIfEmpty(grid: Cell[][], midX: number, dx: number, y: number, v: Cell) {
  setIfEmpty(grid, midX - dx, y, v);
  setIfEmpty(grid, midX + dx - 1, y, v);
}

// ═══════════════════════════════════════════════════════
//  CONTINUOUS PROCEDURAL PART PARAMETERS
//  Every parameter is a float derived from DNA — no fixed pools.
//  This creates truly INFINITE unique creatures.
// ═══════════════════════════════════════════════════════

/** Mix multiple DNA values into a 0..1 float via hash cascade */
function dnaFloat(...vals: number[]): number {
  let h = 5381;
  for (const v of vals) {
    const iv = Math.round(v * 100000);
    h = ((h << 5) + h + iv) >>> 0;
  }
  return (h % 10000) / 10000;
}
 

/** Mix DNA values into an integer in range [min, max] */

function _dnaInt(min: number, max: number, ...vals: number[]): number {
  return min + Math.round(dnaFloat(...vals) * (max - min));
}

/** Returns true with probability p, deterministic per DNA mix */
function dnaChance(p: number, ...vals: number[]): boolean {
  return dnaFloat(...vals) < p;
}

// ── Continuous part parameter types ──
interface EarParams {
  height: number;      // 1-7 pixels
  width: number;       // 1-4 pixels
  pointiness: number;  // 0=round, 1=sharp
  flop: number;        // 0=upright, 1=drooping
  innerColor: boolean; // show inner ear accent
  curl: number;        // 0=straight, 1=curled
  separation: number;  // 0=close to head, 1=far out
  thickness: number;   // 0=thin, 1=thick
}

interface ArmParams {
  length: number;      // 0-6 pixels
  thickness: number;   // 0=thin, 1=thick
  wave: number;        // 0=straight, 1=wavy
  endShape: number;    // 0=round, 0.5=hand, 1=claw
  angle: number;       // 0=down, 1=up
  hasArms: boolean;    // some creatures have no arms
}

interface TailParams {
  length: number;      // 0-7 pixels
  curl: number;        // 0=straight, 1=curled
  thickness: number;   // 0=thin, 1=thick
  tipShape: number;    // 0=round, 0.5=pointed, 1=special (flame/star)
  branching: number;   // 0=single, 1=split
  hasTail: boolean;
  direction: number;   // 0=horizontal, 1=diagonal up
  fluffy: number;      // 0=smooth, 1=fluffy/wide
}

interface EyeParams {
  size: number;        // 1-3 px wide
  height: number;      // 1-3 px tall
  sparkle: number;     // 0=none, 1=double sparkle
  pupilSize: number;   // 0=small, 1=fills eye
  expression: number;  // 0=droopy, 0.5=normal, 1=fierce
  irisColor: boolean;  // show accent color in iris
  separation: number;  // how far apart (continuous)
}

interface MouthParams {
  width: number;       // 0-4 px
  open: number;        // 0=closed, 1=open
  curve: number;       // 0=frown, 0.5=neutral, 1=smile
  hasFang: boolean;
  hasTongue: boolean;
  hasMouth: boolean;
}

interface FeatureParams {
  headType: number;    // 0=none, 0.3=horn, 0.6=crown/crest, 1=halo
  headSize: number;    // 0=small, 1=large
  hasWings: boolean;
  wingSize: number;    // 0=small, 1=large
  bodyMarkType: number; // 0=none, 0.3=belly, 0.6=collar, 1=cape
  spikeCount: number;  // 0-4
  hasSprout: boolean;
}

interface PatternParams {
  density: number;     // 0=none, 1=heavy
  scale: number;       // 0=fine, 1=coarse
  angle: number;       // 0=horizontal, 0.5=diagonal, 1=vertical
  type: number;        // continuous: 0=dots, 0.3=stripes, 0.6=diamonds, 1=waves
  hasPattern: boolean;
}

interface FaceParams {
  blushIntensity: number; // 0=none, 1=bright
  markType: number;       // 0=none, 0.3=freckles, 0.6=whiskers, 1=special
  hasFaceMarks: boolean;
}

// ═══════════════════════════════════════════════════════
//  MAIN PROCEDURAL GENERATOR
// ═══════════════════════════════════════════════════════

function generateSprite(
  appearance: ResolvedIdentityAppearance,
  frame: 0 | 1,
): Cell[][] {
  const grid: Cell[][] = Array.from({ length: GRID }, () =>
    Array(GRID).fill(0) as Cell[],
  );
  const midX = GRID / 2; // 12
  const rng = createRng(
    appearance.palette.primary +
    appearance.palette.secondary +
    appearance.formKey,
  );

  // ── Extract DNA ──
  const m = appearance.manifestation;
  const p = appearance.presence;
  const warmth = m.warmth;       // body roundness
  const structure = m.structure; // body angularity
  const coherence = m.coherence; // head-to-body ratio (chibi-ness)
  const ferality = m.ferality;   // limb sharpness
  const luminosity = m.luminosity; // eye size
  const surreality = m.surreality; // body patterns
  const depth = m.depth;         // tail
  const growth = m.growth;       // extra features

  // ── Derived body parameters ──
  const bodyScale = 0.6 + p.coreScale * 0.8; // 0.6..1.4
  const asymSeed = p.orbitOffset / 360;       // 0..1

  // ═══════════════════════════════════════════════════════
  //  CONTINUOUS PART PARAMETERS — derived from DNA floats
  //  Every creature gets unique continuous values, not discrete types
  // ═══════════════════════════════════════════════════════

  const ear: EarParams = {
    height: 1 + Math.round(dnaFloat(warmth, p.nodeCount, 0.1) * 6),
    width: 1 + Math.round(dnaFloat(structure, p.bandCount, 0.2) * 3),
    pointiness: dnaFloat(ferality, p.nodeCount, 0.3),
    flop: dnaFloat(warmth, coherence, 0.4),
    innerColor: dnaChance(0.55, warmth, luminosity, 0.5),
    curl: dnaFloat(depth, p.orbitOffset / 360, 0.6),
    separation: dnaFloat(p.bandTilt / 48, coherence, 0.7),
    thickness: dnaFloat(warmth, growth, 0.8),
  };

  const arm: ArmParams = {
    length: Math.round(dnaFloat(ferality, p.bandCount, 1.1) * 6),
    thickness: dnaFloat(warmth, structure, 1.2),
    wave: dnaFloat(surreality, p.orbitOffset / 360, 1.3),
    endShape: dnaFloat(ferality, depth, 1.4),
    angle: dnaFloat(growth, p.bandTilt / 48, 1.5),
    hasArms: dnaChance(0.88, ferality, coherence, 1.6),
  };

  const tail: TailParams = {
    length: Math.round(dnaFloat(depth, p.nodeCount, 2.1) * 7),
    curl: dnaFloat(warmth, depth, 2.2),
    thickness: dnaFloat(structure, depth, 2.3),
    tipShape: dnaFloat(luminosity, depth, 2.4),
    branching: dnaFloat(surreality, depth, 2.5),
    hasTail: dnaChance(0.82, depth, ferality, 2.6),
    direction: dnaFloat(p.bandTilt / 48, depth, 2.7),
    fluffy: dnaFloat(warmth, growth, 2.8),
  };

  const eye: EyeParams = {
    size: 1 + Math.round(dnaFloat(luminosity, coherence, 3.1) * 2),
    height: 1 + Math.round(dnaFloat(luminosity, warmth, 3.2) * 2),
    sparkle: dnaFloat(luminosity, growth, 3.3),
    pupilSize: dnaFloat(coherence, ferality, 3.4),
    expression: dnaFloat(ferality, warmth, 3.5),
    irisColor: dnaChance(0.4, luminosity, surreality, 3.6),
    separation: dnaFloat(p.nodeCount / 10, structure, 3.7),
  };

  const mouth: MouthParams = {
    width: Math.round(dnaFloat(warmth, ferality, 4.1) * 4),
    open: dnaFloat(ferality, surreality, 4.2),
    curve: dnaFloat(warmth, luminosity, 4.3),
    hasFang: dnaChance(0.2, ferality, depth, 4.4),
    hasTongue: dnaChance(0.12, warmth, surreality, 4.5),
    hasMouth: dnaChance(0.9, warmth, coherence, 4.6),
  };

  const feat: FeatureParams = {
    headType: dnaFloat(growth, luminosity, 5.1),
    headSize: dnaFloat(growth, structure, 5.2),
    hasWings: dnaChance(0.25, surreality, growth, 5.3),
    wingSize: dnaFloat(surreality, ferality, 5.4),
    bodyMarkType: dnaFloat(warmth, growth, 5.5),
    spikeCount: Math.round(dnaFloat(ferality, structure, 5.6) * 4),
    hasSprout: dnaChance(0.15, growth, warmth, 5.7),
  };

  const pat: PatternParams = {
    density: dnaFloat(surreality, structure, 6.1),
    scale: dnaFloat(surreality, warmth, 6.2),
    angle: dnaFloat(structure, p.bandTilt / 48, 6.3),
    type: dnaFloat(surreality, depth, 6.4),
    hasPattern: dnaChance(surreality * 0.8, surreality, p.nodeCount / 10, 6.5),
  };

  const face: FaceParams = {
    blushIntensity: dnaFloat(warmth, luminosity, 7.1),
    markType: dnaFloat(surreality, warmth, 7.2),
    hasFaceMarks: dnaChance(0.45, warmth, luminosity, 7.3),
  };

  // ── 1. BODY GENERATION ──
  // Body dimensions driven by DNA
  const baseBodyHeight = Math.round((8 + warmth * 4) * bodyScale);
  const bodyHeight = Math.max(6, Math.min(14, baseBodyHeight));
  const baseBodyWidth = Math.round((4 + warmth * 4 + (1 - structure) * 2) * bodyScale);
  const maxHalfWidth = Math.max(3, Math.min(8, baseBodyWidth));

  // Head size from coherence (chibi factor)
  const headRatio = 0.25 + coherence * 0.3; // 0.25..0.55
  const headRows = Math.max(3, Math.round(bodyHeight * headRatio));
  const headWidth = Math.max(maxHalfWidth, Math.round(maxHalfWidth * (0.9 + coherence * 0.5)));
  const headHW = Math.min(9, headWidth);

  // Position body: leave room for ears/crown on top, legs on bottom
  // Reserve top space based on ear height (taller ears need more room)
  const topMargin = Math.min(8, 3 + Math.max(0, Math.round(ear.height / 2) - 1));
  const bodyTop = Math.max(topMargin, Math.min(8, GRID - bodyHeight - 4)) + (frame === 1 ? -1 : 0);
  const bodyBottom = bodyTop + bodyHeight - 1;

  // Build per-row half-widths
  const halfWidths: number[] = [];
  for (let r = 0; r < bodyHeight; r++) {
    let hw: number;

    if (r < headRows) {
      // Head region: wide, slightly rounded
      const headT = r / Math.max(1, headRows - 1);
      const headCurve = Math.sin(headT * Math.PI * 0.8 + 0.3);
      hw = Math.round(headHW * (0.7 + headCurve * 0.35));
      // Angular heads for high structure
      if (structure > 0.6) {
        hw = Math.round(headHW * (0.75 + headT * 0.25));
      }
    } else {
      // Body region
      const bodyT = (r - headRows) / Math.max(1, bodyHeight - headRows - 1);
      if (structure > 0.5) {
        // Geometric/angular body: more rectangular
        const rect = 1 - Math.abs(bodyT - 0.3) * 0.4;
        hw = Math.round(maxHalfWidth * rect);
      } else {
        // Round/blobby body
        const bell = Math.sin((bodyT * 0.7 + 0.15) * Math.PI);
        hw = Math.round(maxHalfWidth * (0.6 + bell * 0.45));
      }
      // Warm = wider body (chubby)
      hw = Math.round(hw * (0.85 + warmth * 0.3));
    }

    // Slight asymmetry from orbitOffset
    const asymNoise = Math.sin(r * 2.3 + asymSeed * 6.28) * 0.3;
    hw = Math.max(2, Math.min(10, hw + Math.round(asymNoise)));
    halfWidths.push(hw);
  }

  // Neck pinch between head and body (if coherence is moderate)
  if (headRows < bodyHeight - 2 && coherence > 0.3) {
    const neckRow = headRows;
    const neckPinch = Math.round(1 + (1 - warmth) * 1.5);
    halfWidths[neckRow] = Math.max(2, halfWidths[neckRow] - neckPinch);
    if (neckRow + 1 < bodyHeight) {
      halfWidths[neckRow + 1] = Math.max(2, halfWidths[neckRow + 1] - Math.round(neckPinch * 0.5));
    }
  }

  // Fill body cells (mirrored)
  for (let r = 0; r < bodyHeight; r++) {
    const y = bodyTop + r;
    if (y < 0 || y >= GRID) continue;
    const hw = halfWidths[r];
    for (let dx = 0; dx < hw; dx++) {
      setMirrored(grid, midX, dx + 1, y, 3);
    }
  }

  // ── 2. EARS (continuous procedural) ──
  const earBaseY = bodyTop;
  const earBaseHW = halfWidths[0];
  {
    const ex = earBaseHW + Math.round(ear.separation * 2) - 1;
    const h = ear.height;
    const w = Math.max(1, ear.width);
    const isUpright = ear.flop < 0.5;

    if (isUpright) {
      // Upright ears — grow upward from head top
      for (let dy = 1; dy <= h; dy++) {
        // Width tapers toward tip based on pointiness
        const rowProgress = dy / h; // 0=base, 1=tip
        const taper = ear.pointiness > 0.5
          ? Math.max(1, Math.round(w * (1 - rowProgress * 0.7)))  // pointy: narrow at top
          : Math.max(1, Math.round(w * (0.7 + Math.sin(rowProgress * Math.PI) * 0.3))); // round: bulge

        for (let dx = 0; dx < taper; dx++) {
          // Curl: offset x as we go up
          const curlOffset = Math.round(ear.curl * (dy / h) * 2 * (ear.curl > 0.5 ? 1 : -1));
          setMirrored(grid, midX, ex + dx + curlOffset, earBaseY - dy, 3);
        }
        // Inner ear accent color
        if (ear.innerColor && dy > 1 && dy < h && taper > 1) {
          const curlOffset = Math.round(ear.curl * (dy / h) * 2 * (ear.curl > 0.5 ? 1 : -1));
          setMirrored(grid, midX, ex + curlOffset, earBaseY - dy, 5);
        }
      }
      // Tip highlight
      const tipCurl = Math.round(ear.curl * 2 * (ear.curl > 0.5 ? 1 : -1));
      setMirrored(grid, midX, ex + tipCurl, earBaseY - h, 4);
    } else {
      // Floppy/droopy ears — go up briefly then droop down
      const upPart = Math.max(1, Math.round(h * 0.25));
      const downPart = h - upPart;
      // Up portion
      for (let dy = 1; dy <= upPart; dy++) {
        for (let dx = 0; dx < w; dx++) {
          setMirrored(grid, midX, ex + dx, earBaseY - dy, 3);
        }
      }
      // Down portion — extends sideways and down
      for (let dy = 0; dy < downPart; dy++) {
        const sway = Math.round(Math.sin(dy * 0.8 + ear.curl * 3) * ear.curl);
        for (let dx = 0; dx < Math.max(1, w - (dy > downPart - 2 ? 1 : 0)); dx++) {
          setMirrored(grid, midX, ex + w + dx + sway, earBaseY - upPart + dy + 1, 3);
        }
        if (ear.innerColor && dy < downPart - 1) {
          setMirrored(grid, midX, ex + w + sway, earBaseY - upPart + dy + 1, 5);
        }
      }
      // Tip accent
      setMirrored(grid, midX, ex + w, earBaseY - upPart + downPart, 5);
    }
  }

  // ── 3. ARMS / LIMBS (continuous procedural) ──
  const armY = bodyTop + headRows + Math.round((bodyHeight - headRows) * 0.2);
  const armHW = halfWidths[headRows + Math.round((bodyHeight - headRows) * 0.2)] || maxHalfWidth;

  if (arm.hasArms && arm.length > 0) {
    const len = Math.max(1, arm.length);
    const thick = arm.thickness > 0.5;

    for (let i = 0; i < len; i++) {
      // Wave effect: sinusoidal horizontal offset
      const waveOffset = Math.round(Math.sin(i * 1.2 + arm.wave * 4) * arm.wave * 1.5);
      // Angle: arm direction (0=down, 1=up-angled)
      const angleOffset = arm.angle > 0.6 ? -Math.round(i * 0.4) : 0;

      setMirrored(grid, midX, armHW + 1 + waveOffset, armY + i + angleOffset, 3);
      if (thick) {
        setMirrored(grid, midX, armHW + 2 + waveOffset, armY + i + angleOffset, 3);
      }
    }

    // End shape: continuous from round → hand → claw
    const endY = armY + len - 1 + (arm.angle > 0.6 ? -Math.round((len - 1) * 0.4) : 0);
    const endWave = Math.round(Math.sin((len - 1) * 1.2 + arm.wave * 4) * arm.wave * 1.5);
    if (arm.endShape > 0.7) {
      // Claw/sharp end
      setMirrored(grid, midX, armHW + 2 + endWave, endY, 5);
      setMirrored(grid, midX, armHW + 1 + endWave, endY + 1, 5);
      if (arm.endShape > 0.85) setMirrored(grid, midX, armHW + 2 + endWave, endY + 1, 5);
    } else if (arm.endShape > 0.35) {
      // Hand/paw
      setMirrored(grid, midX, armHW + 1 + endWave, endY + 1, 3);
      if (thick) setMirrored(grid, midX, armHW + 2 + endWave, endY + 1, 4);
    } else {
      // Round/nub
      setMirrored(grid, midX, armHW + 1 + endWave, endY + 1, 3);
    }
  }

  // ── 4. LEGS ──
  // Legs style influenced by ferality
  const legSpacing = Math.max(1, Math.round(halfWidths[bodyHeight - 1] * 0.5));
  const legHeight = ferality > 0.7 ? 3 : 2;
  const legWidth = ferality > 0.5 ? 1 : 1;

  // Only add legs if the creature isn't ghost-like (veil-shell or low ferality + high surreality)
  const hasLegs = !(ferality < 0.2 && surreality > 0.6);
  if (hasLegs) {
    for (let dy = 1; dy <= legHeight; dy++) {
      setMirrored(grid, midX, legSpacing, bodyBottom + dy, 3);
      if (legWidth > 1) {
        setMirrored(grid, midX, legSpacing + 1, bodyBottom + dy, 3);
      }
    }
    // Feet
    if (ferality > 0.6) {
      // Clawed feet
      setMirrored(grid, midX, legSpacing + 1, bodyBottom + legHeight, 5);
      setMirrored(grid, midX, legSpacing - 1, bodyBottom + legHeight, 3);
    } else {
      // Round feet
      setMirrored(grid, midX, legSpacing + 1, bodyBottom + legHeight, 3);
    }
  } else {
    // Ghost-like wavy bottom
    for (let dx = 1; dx < halfWidths[bodyHeight - 1]; dx++) {
      const wave = Math.round(Math.sin(dx * 1.8 + rng() * 3) * 1.2);
      if (wave > 0) {
        for (let dy = 1; dy <= wave; dy++) {
          setMirroredIfEmpty(grid, midX, dx, bodyBottom + dy, 2);
        }
      }
    }
  }

  // ── 5. TAIL (continuous procedural) ──
  const tailSide = rng() > 0.5 ? 1 : -1;
  const tailStartRow = Math.round(bodyHeight * 0.6);
  const tailBaseY = bodyTop + tailStartRow;
  const tailBaseHW = halfWidths[Math.min(tailStartRow, bodyHeight - 1)] || 3;

  if (tail.hasTail && tail.length > 0) {
    const len = Math.max(1, tail.length);
    const tx0 = midX + tailSide * tailBaseHW;
    const thick = tail.thickness > 0.5;
    const fluffRadius = Math.round(tail.fluffy * 1.5); // 0-1 extra rows above/below

    for (let i = 0; i < len; i++) {
      const progress = i / Math.max(1, len - 1);

      // Curl: vertical offset that increases with progress
      const curlY = Math.round(tail.curl * progress * progress * -3);
      // Direction: 0=horizontal, 1=diagonal up
      const dirY = Math.round(tail.direction * progress * -2);
      const py = tailBaseY + curlY + dirY;
      const px = tx0 + tailSide * (i + 1);

      setIfEmpty(grid, px, py, 3);
      if (thick) setIfEmpty(grid, px, py + 1, 3);

      // Fluffy: extra pixels around tail
      if (fluffRadius > 0 && i > 0 && i < len - 1) {
        for (let fy = -fluffRadius; fy <= fluffRadius; fy++) {
          if (fy === 0) continue;
          setIfEmpty(grid, px, py + fy, 4);
        }
      }
    }

    // Tip shape: continuous from round → pointed → special
    const tipPx = tx0 + tailSide * (len + 1);
    const tipCurlY = Math.round(tail.curl * -3);
    const tipDirY = Math.round(tail.direction * -2);
    const tipPy = tailBaseY + tipCurlY + tipDirY;

    if (tail.tipShape > 0.7) {
      // Special tip: flame/star burst
      setIfEmpty(grid, tipPx, tipPy, 4);
      setIfEmpty(grid, tipPx, tipPy - 1, 4);
      setIfEmpty(grid, tipPx, tipPy + 1, 4);
      if (tail.tipShape > 0.85) setIfEmpty(grid, tipPx + tailSide, tipPy, 4);
    } else if (tail.tipShape > 0.35) {
      // Pointed/accent tip
      setIfEmpty(grid, tipPx, tipPy, 5);
      if (tail.tipShape > 0.5) setIfEmpty(grid, tipPx, tipPy - 1, 5);
    } else {
      // Round/blob tip
      setIfEmpty(grid, tipPx, tipPy, 3);
    }

    // Branching: split at end
    if (tail.branching > 0.6 && len >= 3) {
      const splitAt = tx0 + tailSide * len;
      const splitBaseY = tailBaseY + Math.round(tail.curl * -3 * ((len - 1) / len)) + Math.round(tail.direction * -2 * ((len - 1) / len));
      setIfEmpty(grid, splitAt + tailSide, splitBaseY - 1, 4);
      setIfEmpty(grid, splitAt + tailSide, splitBaseY + 1, 4);
      if (tail.branching > 0.8) {
        setIfEmpty(grid, splitAt + tailSide * 2, splitBaseY - 2, 4);
        setIfEmpty(grid, splitAt + tailSide * 2, splitBaseY + 2, 4);
      }
    }
  }

  // ── 6. EXTRA FEATURES (continuous procedural) ──
  {
    // Head feature: horn / crown / crest / halo — continuous
    if (feat.headType > 0.15) {
      const size = 1 + Math.round(feat.headSize * 3); // 1-4 pixels tall

      if (feat.headType < 0.4) {
        // Horn(s): single or mirrored based on continuous value
        const mirrored = feat.headType > 0.25;
        if (mirrored) {
          const hx = Math.max(2, earBaseHW - 2);
          for (let dy = 1; dy <= size; dy++) {
            setMirroredIfEmpty(grid, midX, hx, bodyTop - dy, 5);
          }
          setMirroredIfEmpty(grid, midX, hx, bodyTop - size - 1, 4);
        } else {
          for (let dy = 1; dy <= size; dy++) {
            setIfEmpty(grid, midX, bodyTop - dy, 5);
            if (dy === 1) setIfEmpty(grid, midX - 1, bodyTop - dy, 5);
          }
          setIfEmpty(grid, midX, bodyTop - size - 1, 4);
        }
      } else if (feat.headType < 0.7) {
        // Crown / crest / mohawk — wide head decoration
        const width = 1 + Math.round(feat.headSize * 3); // 1-4 half-width
        for (let dx = -width; dx <= width; dx++) {
          setIfEmpty(grid, midX + dx, bodyTop - 1, 5);
        }
        // Prongs: number based on headSize
        const prongs = 1 + Math.round(feat.headSize * 2);
        const spacing = Math.max(1, Math.floor(width * 2 / Math.max(1, prongs)));
        for (let i = 0; i < prongs; i++) {
          const px = midX - width + i * spacing + Math.round(spacing / 2);
          for (let dy = 2; dy <= 1 + Math.round(feat.headSize * 2); dy++) {
            setIfEmpty(grid, px, bodyTop - dy, dy === 1 + Math.round(feat.headSize * 2) ? 4 : 5);
          }
        }
      } else {
        // Halo / floating ring
        const haloY = bodyTop - 2 - Math.round(feat.headSize * 2);
        const hw = 1 + Math.round(feat.headSize * 2);
        for (let dx = -hw; dx <= hw; dx++) {
          setIfEmpty(grid, midX + dx, haloY, 5);
        }
        setIfEmpty(grid, midX - hw - 1, haloY + 1, 5);
        setIfEmpty(grid, midX + hw + 1, haloY + 1, 5);
      }
    }

    // Sprout on top
    if (feat.hasSprout) {
      setIfEmpty(grid, midX, bodyTop - 1, 5);
      setIfEmpty(grid, midX - 1, bodyTop - 2, 5);
      setIfEmpty(grid, midX + 1, bodyTop - 2, 5);
      setIfEmpty(grid, midX, bodyTop - 3, 5);
    }

    // Wings
    if (feat.hasWings) {
      const wy = bodyTop + headRows;
      const wBase = halfWidths[headRows] || maxHalfWidth;
      const wSpan = 2 + Math.round(feat.wingSize * 3); // 2-5 pixels wide
      const wHeight = 2 + Math.round(feat.wingSize * 3); // 2-5 pixels tall

      for (let dy = -Math.floor(wHeight / 2); dy < Math.ceil(wHeight / 2); dy++) {
        // Wing tapers: widest at center
        const rowProgress = Math.abs(dy) / Math.max(1, Math.floor(wHeight / 2));
        const rowWidth = Math.max(1, Math.round(wSpan * (1 - rowProgress * 0.5)));
        for (let wx = 1; wx <= rowWidth; wx++) {
          const color: Cell = (dy < 0 || wx >= rowWidth) ? 4 : 3;
          setMirroredIfEmpty(grid, midX, wBase + wx + 1, wy + dy, color);
        }
      }
    }

    // Spikes along back
    if (feat.spikeCount > 0) {
      for (let i = 0; i < feat.spikeCount; i++) {
        const sy = bodyTop + headRows + i * 2;
        if (sy < bodyBottom) {
          const sw = halfWidths[sy - bodyTop] || 3;
          setMirrored(grid, midX, sw + 1, sy, 5);
          setMirrored(grid, midX, sw + 1, sy - 1, 4);
        }
      }
    }
  }

  // ── 6b. BODY MODIFIERS (continuous procedural) ──
  {
    if (feat.bodyMarkType > 0.15) {
      if (feat.bodyMarkType < 0.35) {
        // Belly patch: lighter area on torso
        const bellyStart = bodyTop + headRows + 2;
        const bellyRows = 2 + Math.round(feat.headSize * 2);
        for (let dy = 0; dy < bellyRows && bellyStart + dy < bodyBottom; dy++) {
          const bw = Math.max(1, (halfWidths[headRows + 2 + dy] || 2) - 2);
          for (let dx = 0; dx < bw; dx++) {
            setMirrored(grid, midX, dx, bellyStart + dy, 4);
          }
        }
      } else if (feat.bodyMarkType < 0.55) {
        // Collar / necklace
        const neckY = bodyTop + headRows;
        const nw = halfWidths[headRows] || 3;
        for (let dx = 0; dx < nw + 1; dx++) {
          setMirrored(grid, midX, dx, neckY, 5);
        }
      } else if (feat.bodyMarkType < 0.75) {
        // Belt / band around waist
        const beltY = bodyTop + headRows + Math.floor((bodyHeight - headRows) * 0.5);
        const bw = halfWidths[beltY - bodyTop] || 3;
        for (let dx = 0; dx < bw; dx++) {
          setMirrored(grid, midX, dx, beltY, 2);
        }
      } else if (feat.bodyMarkType < 0.9) {
        // Cape behind body
        const capeY = bodyTop + headRows;
        const capeLen = 2 + Math.round(feat.headSize * 3);
        for (let dy = 0; dy < capeLen && capeY + dy <= bodyBottom + 1; dy++) {
          const cw = Math.min(maxHalfWidth + 1 + Math.round(dy * 0.7), 10);
          for (let dx = maxHalfWidth; dx < cw; dx++) {
            setMirrored(grid, midX, dx, capeY + dy, 2);
          }
        }
      } else {
        // Mane around neck
        const maneY = bodyTop + headRows - 1;
        for (let dy = -1; dy <= 2; dy++) {
          const mw = (halfWidths[headRows + dy] || 3) + 1;
          setMirrored(grid, midX, mw, maneY + dy, 3);
          setMirrored(grid, midX, mw + 1, maneY + dy, 4);
        }
      }
    }
  }

  // ── 7. PATTERNS (continuous procedural) ──
  // Pattern is a continuous function of position, driven by DNA floats
  if (pat.hasPattern && pat.density > 0.1) {
    // Continuous pattern parameters create unique interference patterns
    const freq = 1 + pat.scale * 4;  // spatial frequency
    const angle = pat.angle * Math.PI; // pattern rotation angle
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const threshold = 1 - pat.density * 0.6; // higher density = more marks

    for (let y = bodyTop; y <= bodyBottom; y++) {
      for (let x = 0; x < GRID; x++) {
        if (grid[y][x] !== 3) continue;

        // Rotate coordinates by pattern angle
        const rx = (x - midX) * cosA + (y - bodyTop) * sinA;
        const ry = -(x - midX) * sinA + (y - bodyTop) * cosA;

        // Blend between pattern functions based on pat.type (continuous)
        let v: number;
        if (pat.type < 0.25) {
          // Dots: hash-based scattered
          v = ((Math.round(rx * freq) * 7 + Math.round(ry * freq) * 13) % 11) / 11;
        } else if (pat.type < 0.5) {
          // Stripes: sinusoidal
          v = (Math.sin(rx * freq * 0.8) + 1) * 0.5;
        } else if (pat.type < 0.75) {
          // Diamonds / checker
          v = (Math.sin(rx * freq * 0.6) * Math.sin(ry * freq * 0.6) + 1) * 0.5;
        } else {
          // Waves: compound sine
          v = (Math.sin(rx * freq * 0.5 + Math.sin(ry * 0.7) * 2) + 1) * 0.5;
        }

        if (v > threshold) grid[y][x] = 5;
      }
    }
  }

  // ── 8. SHADING ──
  // Apply highlight/shadow to body-colored cells
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (grid[y][x] !== 3) continue;
      const relY = (y - bodyTop) / Math.max(1, bodyHeight);

      // Top highlight
      if (relY < 0.18) {
        grid[y][x] = 4;
        continue;
      }
      // Bottom shadow
      if (relY > 0.82) {
        grid[y][x] = 2;
        continue;
      }
      // Left-edge shadow (for 3D depth)
      if (x > 0 && x < midX && grid[y][x - 1] === 0) {
        grid[y][x] = 2;
      }
    }
  }

  // ── 9. EYES (continuous procedural) ──
  const eyeRowOffset = Math.round(headRows * 0.45);
  const eyeY = bodyTop + eyeRowOffset + (frame === 1 ? -1 : 0);
  const eyeSpacing = Math.max(2, Math.round(halfWidths[0] * (0.3 + eye.separation * 0.3)));

  const eyeW = eye.size;
  const eyeH = eye.height;

  const leftEyeX = midX - eyeSpacing - Math.floor(eyeW / 2);
  const rightEyeX = midX + eyeSpacing - Math.floor(eyeW / 2);

  {
    // Draw eye whites
    for (let dy = 0; dy < eyeH; dy++) {
      for (let dx = 0; dx < eyeW; dx++) {
        setCell(grid, leftEyeX + dx, eyeY + dy, 6);
        setCell(grid, rightEyeX + dx, eyeY + dy, 6);
      }
    }

    // Pupil: size and position vary continuously
    const pupilW = Math.max(1, Math.round(eyeW * (0.3 + eye.pupilSize * 0.5)));
    const pupilH = Math.max(1, Math.round(eyeH * (0.3 + eye.pupilSize * 0.5)));
    const pupilOffY = Math.max(0, eyeH - pupilH); // pupils sit at bottom

    for (let dy = 0; dy < pupilH; dy++) {
      for (let dx = 0; dx < pupilW; dx++) {
        // Left eye: pupil toward inner side
        setCell(grid, leftEyeX + (eyeW - pupilW) + dx, eyeY + pupilOffY + dy,
          eye.irisColor && dy === 0 ? 10 : 7);
        // Right eye: pupil toward inner side
        setCell(grid, rightEyeX + dx, eyeY + pupilOffY + dy,
          eye.irisColor && dy === 0 ? 10 : 7);
      }
    }

    // Sparkle highlights: continuous intensity
    if (eye.sparkle > 0.2 && eyeW >= 2 && eyeH >= 2) {
      // Main highlight: top-right of each eye
      setCell(grid, leftEyeX + eyeW - 1, eyeY, 6);
      setCell(grid, rightEyeX + eyeW - 1, eyeY, 6);
      // Second highlight (only if sparkle > 0.6)
      if (eye.sparkle > 0.6 && eyeH >= 3) {
        setCell(grid, leftEyeX, eyeY + eyeH - 1, 6);
        setCell(grid, rightEyeX, eyeY + eyeH - 1, 6);
      }
    }

    // Expression: droopy lids or fierce brows
    if (eye.expression < 0.25 && eyeH >= 2) {
      // Droopy: lid pixel on outside-bottom
      setCell(grid, leftEyeX - 1, eyeY + eyeH - 1, 1);
      setCell(grid, rightEyeX + eyeW, eyeY + eyeH - 1, 1);
    } else if (eye.expression > 0.8) {
      // Fierce: angry brow pixels
      for (let dx = 0; dx < eyeW; dx++) {
        setCell(grid, leftEyeX + dx, eyeY - 1, 1);
        setCell(grid, rightEyeX + dx, eyeY - 1, 1);
      }
    }
  }

  // ── 10. MOUTH (continuous procedural) ──
  const mouthY = eyeY + eyeH + (eyeH >= 3 ? 0 : 1);
  if (mouth.hasMouth) {
    const mw = Math.max(1, mouth.width);
    const halfMW = Math.floor(mw / 2);

    // Main mouth line
    for (let dx = -halfMW; dx <= halfMW; dx++) {
      setCell(grid, midX + dx, mouthY, 8);
    }

    // Smile curve: raised corners
    if (mouth.curve > 0.65 && mw >= 2) {
      setCell(grid, midX - halfMW - 1, mouthY - 1, 8);
      setCell(grid, midX + halfMW + 1, mouthY - 1, 8);
    }
    // Frown curve: lowered corners
    if (mouth.curve < 0.3 && mw >= 2) {
      setCell(grid, midX - halfMW, mouthY + 1, 8);
      setCell(grid, midX + halfMW, mouthY + 1, 8);
    }

    // Open mouth: second row
    if (mouth.open > 0.5) {
      for (let dx = -halfMW; dx <= halfMW; dx++) {
        setCell(grid, midX + dx, mouthY + 1, 8);
      }
    }

    // Fang
    if (mouth.hasFang) {
      setCell(grid, midX - halfMW, mouthY + 1, 6);
    }

    // Tongue
    if (mouth.hasTongue) {
      setCell(grid, midX, mouthY + 1, 9);
      if (mouth.open > 0.5) setCell(grid, midX, mouthY + 2, 9);
    }
  }

  // ── 11. FACE MARKS (continuous procedural) ──
  const blushY = eyeY + eyeH - 1;
  const blushSpread = eyeSpacing + eyeW;
  if (face.hasFaceMarks) {
    if (face.blushIntensity > 0.4) {
      // Blush: intensity controls size
      setMirrored(grid, midX, blushSpread, blushY, 9);
      if (face.blushIntensity > 0.6) {
        setMirrored(grid, midX, blushSpread, blushY + 1, 9);
      }
      if (face.blushIntensity > 0.8) {
        setMirrored(grid, midX, blushSpread - 1, blushY, 9);
      }
    }

    // Face marks: type is continuous
    if (face.markType > 0.15) {
      if (face.markType < 0.35) {
        // Freckles
        setMirrored(grid, midX, blushSpread - 1, blushY, 2);
        setMirrored(grid, midX, blushSpread, blushY + 1, 2);
        setMirrored(grid, midX, blushSpread + 1, blushY, 2);
      } else if (face.markType < 0.55) {
        // Whiskers: length varies
        const whiskerLen = 2 + Math.round(face.markType * 3);
        for (let i = 0; i < whiskerLen; i++) {
          setMirrored(grid, midX, blushSpread + i, blushY - 1 + Math.round(i * 0.5), 1);
        }
      } else if (face.markType < 0.75) {
        // Tear/scar mark
        setMirrored(grid, midX, eyeSpacing, eyeY + eyeH, 5);
        setMirrored(grid, midX, eyeSpacing, eyeY + eyeH + 1, 5);
      } else {
        // Star/swirl cheek marks
        setMirrored(grid, midX, blushSpread, blushY, 4);
        setMirrored(grid, midX, blushSpread - 1, blushY, 4);
        setMirrored(grid, midX, blushSpread, blushY - 1, 4);
      }
    }
  }

  // ── 12. AUTO-OUTLINE ──
  const outlined: Cell[][] = Array.from({ length: GRID }, (_, y) =>
    Array.from({ length: GRID }, (_, x) => grid[y][x]) as Cell[],
  );
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (grid[y][x] !== 0) continue;
      const hasBody =
        (y > 0 && grid[y - 1][x] > 1) ||
        (y < GRID - 1 && grid[y + 1][x] > 1) ||
        (x > 0 && grid[y][x - 1] > 1) ||
        (x < GRID - 1 && grid[y][x + 1] > 1);
      if (hasBody) outlined[y][x] = 1;
    }
  }

  return outlined;
}

// ── Expression from mood ──
type Expression = "normal" | "happy" | "sleepy" | "surprised";

function getExpression(
  mood: string | null | undefined,
  vitality: number,
): Expression {
  if (vitality < 0.2) return "sleepy";
  if (mood === "happy" || mood === "playful" || mood === "excited") return "happy";
  if (mood === "surprised" || mood === "curious") return "surprised";
  if (mood === "sleepy" || mood === "tired" || mood === "calm") return "sleepy";
  return "normal";
}

// ── Particle system ──
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };

function createParticles(count: number, rng: () => number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.floor(rng() * GRID),
      y: Math.floor(rng() * GRID),
      vx: (rng() - 0.5) * 0.4,
      vy: -0.15 - rng() * 0.3,
      life: Math.floor(rng() * 60),
      maxLife: 40 + Math.floor(rng() * 40),
    });
  }
  return particles;
}

function tickParticle(p: Particle, rng: () => number) {
  p.x += p.vx;
  p.y += p.vy;
  p.life++;
  if (p.life >= p.maxLife) {
    // Respawn
    p.x = 4 + Math.floor(rng() * 16);
    p.y = GRID - 1;
    p.vy = -0.15 - rng() * 0.3;
    p.vx = (rng() - 0.5) * 0.4;
    p.life = 0;
    p.maxLife = 40 + Math.floor(rng() * 40);
  }
}

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export function PixelCreature({
  appearance,
  size = "md",
  mood,
}: {
  appearance: ResolvedIdentityAppearance;
  size?: PresenceSize;
  mood?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const frameRef = useRef(0);
  const blinkUntilRef = useRef(0);
  const bounceFrameRef = useRef(-1);
  const particlesRef = useRef<Particle[] | null>(null);

  const displayPx = SIZE_MAP[size];
  const expression = getExpression(mood ?? appearance.usageMode, appearance.vitality);
  const palette = buildPalette(appearance.palette.primary, appearance.palette.secondary);

  // Precompute both idle frames
  const sprites = useMemo(() => {
    return [
      generateSprite(appearance, 0),
      generateSprite(appearance, 1),
    ];
  }, [
    appearance.palette.primary,
    appearance.palette.secondary,
    appearance.formKey,
    appearance.manifestation.warmth,
    appearance.manifestation.structure,
    appearance.manifestation.coherence,
    appearance.manifestation.ferality,
    appearance.manifestation.luminosity,
    appearance.manifestation.surreality,
    appearance.manifestation.depth,
    appearance.manifestation.growth,
    appearance.presence.nodeCount,
    appearance.presence.bandCount,
    appearance.presence.coreScale,
    appearance.presence.orbitOffset,
    appearance.presence.bandTilt,
  ]);

  // Particle count from visual.particles (scaled down for pixel grid)
  const particleCount = Math.min(8, Math.max(0, Math.floor(appearance.visual.particles / 6)));

  const colorForCell = useCallback(
    (cell: Cell): string | null => {
      switch (cell) {
        case 0: return null;
        case 1: return palette.outline;
        case 2: return palette.shadow;
        case 3: return palette.main;
        case 4: return palette.light;
        case 5: return palette.accent;
        case 6: return palette.eyeWhite;
        case 7: return palette.eyePupil;
        case 8: return palette.outline; // mouth
        case 9: return palette.blush;
        case 10: return palette.accentDark; // iris
        default: return null;
      }
    },
    [palette],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, frame: number) => {
      ctx.clearRect(0, 0, GRID, GRID);
      ctx.imageSmoothingEnabled = false;

      // Glow effect behind creature
      const glowIntensity = appearance.visual.glow / 100;
      if (glowIntensity > 0.3) {
        const [gr, gg, gb] = hexToRgb(appearance.palette.primary);
        ctx.fillStyle = rgbStr(gr, gg, gb, glowIntensity * 0.15);
        ctx.beginPath();
        ctx.arc(GRID / 2, GRID / 2 + 1, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Select idle frame (bob every ~40 ticks at 12fps ~= 3.3s)
      const idleFrame = Math.floor(frame / 40) % 2;
      const sprite = sprites[idleFrame];

      const isBlink = frame < blinkUntilRef.current;
      const bouncing = bounceFrameRef.current >= 0;
      const bouncePhase = bouncing ? (frame - bounceFrameRef.current) : -1;

      // Squish + bounce offsets
      let scaleX = 1, scaleY = 1, offsetY = 0;
      if (bouncing) {
        if (bouncePhase < 2) {
          // Squish frame
          scaleX = 1.15; scaleY = 0.85;
        } else if (bouncePhase < 5) {
          // Bounce up
          offsetY = -1;
          scaleY = 1.05;
        } else if (bouncePhase < 7) {
          // Settle
          offsetY = 0;
        } else {
          bounceFrameRef.current = -1;
        }
      }

      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          let cell = sprite[y][x];
          if (cell === 0) continue;

          // Blink: replace eye cells
          if (isBlink && (cell === 6 || cell === 7 || cell === 10)) {
            if (cell === 7 || cell === 10) {
              cell = 1; // thin line
            } else {
              continue; // hide eye white
            }
          }

          // Happy expression: ^_^ eyes
          if (expression === "happy" && (cell === 6 || cell === 10)) continue;
          if (expression === "happy" && cell === 7) cell = 1;

          // Sleepy: half eyes
          if (expression === "sleepy" && (cell === 6 || cell === 10)) {
            const belowIsEye =
              y < GRID - 1 &&
              (sprite[y + 1][x] === 6 || sprite[y + 1][x] === 7 || sprite[y + 1][x] === 10);
            const aboveIsEye =
              y > 0 &&
              (sprite[y - 1][x] === 6 || sprite[y - 1][x] === 7 || sprite[y - 1][x] === 10);
            if (!(aboveIsEye && !belowIsEye)) continue;
          }

          const color = colorForCell(cell);
          if (!color) continue;
          ctx.fillStyle = color;

          // Apply bounce transform
          let px = x, py = y + offsetY;
          if (bouncing && (scaleX !== 1 || scaleY !== 1)) {
            px = GRID / 2 + (x - GRID / 2) * scaleX;
            py = GRID - (GRID - y) * scaleY + offsetY;
          }
          ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
        }
      }

      // Particles
      if (particleCount > 0) {
        if (!particlesRef.current) {
          const pRng = createRng(appearance.palette.primary + "particles");
          particlesRef.current = createParticles(particleCount, pRng);
        }
        const pRng = createRng(appearance.palette.primary + frame);
        const [pr, pg, pb] = hexToRgb(appearance.palette.primary);
        for (const p of particlesRef.current) {
          tickParticle(p, pRng);
          const alpha = 1 - p.life / p.maxLife;
          if (alpha <= 0) continue;
          ctx.fillStyle = rgbStr(
            Math.min(255, pr + 60),
            Math.min(255, pg + 60),
            Math.min(255, pb + 60),
            alpha * 0.6,
          );
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        }
      }

      // Low vitality overlay
      if (appearance.vitality < 0.25) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, GRID, GRID);
      }
    },
    [
      appearance.vitality,
      appearance.visual.glow,
      appearance.palette.primary,
      colorForCell,
      expression,
      sprites,
      particleCount,
    ],
  );

  // ── Animation loop at 12fps ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let lastTime = 0;
    const FPS = 12;
    const interval = 1000 / FPS;

    function tick(time: number) {
      if (!running) return;
      rafRef.current = requestAnimationFrame(tick);
      if (time - lastTime < interval) return;
      lastTime = time;

      const frame = ++frameRef.current;

      // Random blink every ~3-7 seconds
      if (Math.random() < 0.006 && frame > blinkUntilRef.current) {
        blinkUntilRef.current = frame + 3;
      }

      draw(ctx!, frame);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // ── Tap → squish + bounce ──
  const handleTap = useCallback(() => {
    bounceFrameRef.current = frameRef.current;
    blinkUntilRef.current = frameRef.current + 2;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={GRID}
      height={GRID}
      onClick={handleTap}
      onTouchStart={handleTap}
      className="shrink-0 cursor-pointer"
      style={{
        width: displayPx,
        height: displayPx,
        imageRendering: "pixelated",
      }}
    />
  );
}
