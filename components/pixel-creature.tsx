"use client";

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
//  PART POOLS — combinatorial variety
// ═══════════════════════════════════════════════════════

// ── Ear type pool (20) ──
const EAR_TYPES = [
  "none", "round", "pointy", "cat", "bunny", "floppy", "antenna", "horn",
  "wing-ear", "leaf", "bear", "fox", "demon", "elf", "fin", "mushroom",
  "crystal", "feather", "curl-horn", "droopy",
] as const;
type EarType = (typeof EAR_TYPES)[number];

// ── Arm/limb type pool (12) ──
const ARM_TYPES = [
  "none", "stubby", "flipper", "arms", "tentacle", "wing", "claw",
  "paw", "branch", "ribbon-arm", "shield", "nub",
] as const;
type ArmType = (typeof ARM_TYPES)[number];

// ── Tail style pool (16) ──
const TAIL_STYLES = [
  "none", "stub", "curl", "flame", "fish", "ribbon", "spike", "fluffy",
  "lightning", "heart", "star-tip", "swirl", "split", "feathered",
  "bubble", "chain",
] as const;
type TailStyle = (typeof TAIL_STYLES)[number];

// ── Extra feature pool (20) ──
const EXTRA_FEATURES = [
  "none", "horn-single", "horns-double", "crown", "antenna-pair",
  "wings-small", "wings-large", "halo", "leaf-sprout", "bow",
  "tiara", "mohawk", "flower", "star-mark", "gem", "scarf",
  "third-eye", "crest", "cloud-puff", "sparkle-aura",
] as const;
type ExtraFeature = (typeof EXTRA_FEATURES)[number];

// ── Pattern pool (14) ──
const PATTERN_TYPES = [
  "none", "spots", "stripes-h", "stripes-v", "diamonds", "stars",
  "dots-scattered", "chevron", "waves", "scales", "hearts",
  "zigzag", "cross", "gradient",
] as const;
type PatternType = (typeof PATTERN_TYPES)[number];

// ── Eye style pool (10) — NEW ──
const EYE_STYLES = [
  "round", "oval", "cute-sparkle", "dot", "narrow", "wide",
  "droopy", "fierce", "star-pupil", "heart-pupil",
] as const;
type EyeStyle = (typeof EYE_STYLES)[number];

// ── Mouth style pool (10) — NEW ──
const MOUTH_STYLES = [
  "dot", "smile", "fang", "cat-mouth", "open", "tongue-out",
  "whistle", "pout", "grin", "none",
] as const;
type MouthStyle = (typeof MOUTH_STYLES)[number];

// ── Cheek/face marking pool (8) — NEW ──
const FACE_MARKS = [
  "none", "blush", "freckles", "whiskers", "tear-mark", "scar",
  "star-cheek", "swirl-cheek",
] as const;
type FaceMark = (typeof FACE_MARKS)[number];

// ── Body modifier pool (8) — NEW ──
const BODY_MODS = [
  "none", "belly-patch", "collar", "belt", "cape", "spikes-back",
  "shell", "mane",
] as const;
type BodyMod = (typeof BODY_MODS)[number];

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
  const earTilt = (p.bandTilt + 24) / 48;     // normalized 0..1

  // ── Select parts from DNA (each from a different hash mix) ──
  const pick = (arr: readonly string[], ...seeds: number[]) => {
    const h = seeds.reduce((a, s) => a * 31 + Math.round(s * 1000), 7919);
    return arr[((h >>> 0) % (arr.length - 1)) + 1]; // skip "none" for DNA-driven picks
  };
  const pickWithNone = (arr: readonly string[], val: number, threshold: number, ...seeds: number[]) => {
    if (val < threshold) return arr[0]; // "none"
    const h = seeds.reduce((a, s) => a * 31 + Math.round(s * 1000), 7919);
    return arr[((h >>> 0) % (arr.length - 1)) + 1];
  };

  const earType = pick(EAR_TYPES, p.nodeCount, warmth * 100, structure * 100) as EarType;
  const armType = pick(ARM_TYPES, p.bandCount, ferality * 100, coherence * 100) as ArmType;
  const tailStyle = pickWithNone(TAIL_STYLES, depth, 0.12, depth * 100, warmth * 50, p.orbitOffset) as TailStyle;
  const extraFeature = pickWithNone(EXTRA_FEATURES, growth, 0.18, growth * 100, luminosity * 50, p.bandTilt) as ExtraFeature;
  const patternType = pickWithNone(PATTERN_TYPES, surreality, 0.2, surreality * 100, structure * 50, p.nodeCount) as PatternType;
  const eyeStyle = pick(EYE_STYLES, luminosity * 100, coherence * 50, p.nodeCount) as EyeStyle;
  const mouthStyle = pick(MOUTH_STYLES, warmth * 100, ferality * 100, p.bandCount) as MouthStyle;
  const faceMark = pickWithNone(FACE_MARKS, warmth, 0.3, warmth * 100, luminosity * 50, p.orbitOffset) as FaceMark;
  const bodyMod = pickWithNone(BODY_MODS, growth + ferality, 0.5, growth * 100, ferality * 50, p.bandTilt) as BodyMod;

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
  const topMargin = earType === "bunny" ? 5 : earType === "antenna" ? 4 : 3;
  const bodyTop = Math.max(topMargin, Math.min(8, GRID - bodyHeight - 4)) + (frame === 1 ? -1 : 0);
  const bodyBottom = bodyTop + bodyHeight - 1;

  // Build per-row half-widths
  const halfWidths: number[] = [];
  for (let r = 0; r < bodyHeight; r++) {
    const t = r / Math.max(1, bodyHeight - 1); // 0=top, 1=bottom
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

  // ── 2. EARS ──
  const earBaseY = bodyTop;
  const earBaseHW = halfWidths[0];

  switch (earType) {
    case "round": {
      // Small round bumps
      const ex = earBaseHW - 1;
      setMirrored(grid, midX, ex, earBaseY - 1, 3);
      setMirrored(grid, midX, ex + 1, earBaseY - 1, 3);
      setMirrored(grid, midX, ex, earBaseY - 2, 3);
      break;
    }
    case "pointy": {
      // Triangle ears
      const ex = earBaseHW - 1;
      for (let dy = 1; dy <= 3; dy++) {
        setMirrored(grid, midX, ex + 1, earBaseY - dy, 3);
        if (dy < 3) setMirrored(grid, midX, ex, earBaseY - dy, 3);
      }
      setMirrored(grid, midX, ex + 1, earBaseY - 3, 4); // highlight tip
      break;
    }
    case "cat": {
      // Classic cat ears: triangular, with inner accent
      const ex = earBaseHW;
      for (let dy = 1; dy <= 3; dy++) {
        const w = 3 - dy;
        for (let ddx = 0; ddx <= w; ddx++) {
          setMirrored(grid, midX, ex + ddx, earBaseY - dy, 3);
        }
      }
      // Inner ear accent
      setMirrored(grid, midX, ex, earBaseY - 1, 5);
      setMirrored(grid, midX, ex, earBaseY - 2, 5);
      break;
    }
    case "bunny": {
      // Long bunny ears
      const ex = Math.max(2, earBaseHW - 2);
      const earLen = 4 + Math.round(earTilt * 2);
      for (let dy = 1; dy <= earLen; dy++) {
        setMirrored(grid, midX, ex, earBaseY - dy, 3);
        setMirrored(grid, midX, ex + 1, earBaseY - dy, 3);
      }
      // Inner pink
      for (let dy = 2; dy < earLen; dy++) {
        setMirrored(grid, midX, ex, earBaseY - dy, 5);
      }
      // Rounded top
      setMirrored(grid, midX, ex, earBaseY - earLen, 4);
      break;
    }
    case "floppy": {
      // Floppy ears that droop down the sides
      const ex = earBaseHW;
      // Go up 1 then curve down
      setMirrored(grid, midX, ex, earBaseY - 1, 3);
      setMirrored(grid, midX, ex + 1, earBaseY, 3);
      setMirrored(grid, midX, ex + 1, earBaseY + 1, 3);
      setMirrored(grid, midX, ex + 1, earBaseY + 2, 3);
      setMirrored(grid, midX, ex, earBaseY + 3, 3);
      // Accent tips
      setMirrored(grid, midX, ex, earBaseY + 3, 5);
      break;
    }
    case "antenna": {
      // Thin antenna with ball tip
      const ex = Math.max(2, earBaseHW - 2);
      for (let dy = 1; dy <= 4; dy++) {
        setMirrored(grid, midX, ex, earBaseY - dy, 3);
      }
      // Ball tips
      setMirrored(grid, midX, ex, earBaseY - 5, 5);
      setMirrored(grid, midX, ex + 1, earBaseY - 5, 5);
      setMirrored(grid, midX, ex, earBaseY - 6, 5);
      break;
    }
    case "horn": {
      // Single or double horns
      const ex = Math.max(2, earBaseHW - 1);
      for (let dy = 1; dy <= 3; dy++) {
        setMirrored(grid, midX, ex, earBaseY - dy, 5);
      }
      setMirrored(grid, midX, ex, earBaseY - 4, 4);
      break;
    }
    case "wing-ear": {
      // Small wing-shaped ears
      const ex = earBaseHW;
      setMirrored(grid, midX, ex, earBaseY - 1, 3);
      setMirrored(grid, midX, ex + 1, earBaseY - 2, 3);
      setMirrored(grid, midX, ex + 2, earBaseY - 2, 3);
      setMirrored(grid, midX, ex + 2, earBaseY - 1, 3);
      setMirrored(grid, midX, ex + 1, earBaseY, 3);
      break;
    }
    case "leaf": {
      // Leaf-shaped ears
      const ex = earBaseHW - 1;
      setMirrored(grid, midX, ex, earBaseY - 1, 5);
      setMirrored(grid, midX, ex + 1, earBaseY - 1, 5);
      setMirrored(grid, midX, ex + 1, earBaseY - 2, 5);
      setMirrored(grid, midX, ex, earBaseY - 3, 5);
      // Stem
      setMirrored(grid, midX, ex, earBaseY - 2, 3);
      break;
    }
    case "bear": {
      // Small rounded bear ears on top of head
      const ex = earBaseHW - 1;
      setMirrored(grid, midX, ex, earBaseY - 1, 3);
      setMirrored(grid, midX, ex + 1, earBaseY - 1, 3);
      setMirrored(grid, midX, ex, earBaseY - 2, 3);
      setMirrored(grid, midX, ex + 1, earBaseY - 2, 3);
      setMirrored(grid, midX, ex + 1, earBaseY - 1, 5); // inner ear
      break;
    }
    case "fox": {
      // Large triangular fox ears
      const ex = earBaseHW;
      for (let dy = 1; dy <= 4; dy++) {
        const w = Math.max(0, 3 - dy);
        for (let ddx = 0; ddx <= w; ddx++) {
          setMirrored(grid, midX, ex + ddx, earBaseY - dy, 3);
        }
      }
      setMirrored(grid, midX, ex, earBaseY - 1, 5);
      setMirrored(grid, midX, ex, earBaseY - 2, 5);
      setMirrored(grid, midX, ex, earBaseY - 3, 4);
      break;
    }
    case "demon": {
      // Bat-like demon ears
      const ex = earBaseHW;
      setMirrored(grid, midX, ex, earBaseY - 1, 3);
      setMirrored(grid, midX, ex + 1, earBaseY - 2, 3);
      setMirrored(grid, midX, ex + 2, earBaseY - 3, 3);
      setMirrored(grid, midX, ex + 1, earBaseY - 3, 3);
      setMirrored(grid, midX, ex, earBaseY - 2, 2);
      setMirrored(grid, midX, ex + 2, earBaseY - 2, 3);
      break;
    }
    case "elf": {
      // Long pointed side ears
      const ex = earBaseHW;
      for (let i = 0; i < 4; i++) {
        setMirrored(grid, midX, ex + i, earBaseY - 1 - Math.floor(i * 0.5), 3);
      }
      setMirrored(grid, midX, ex + 4, earBaseY - 2, 4);
      break;
    }
    case "fin": {
      // Fish fin ears
      const ex = earBaseHW;
      for (let dy = 0; dy < 3; dy++) {
        setMirrored(grid, midX, ex + 1, earBaseY - dy - 1, 5);
      }
      setMirrored(grid, midX, ex, earBaseY - 1, 5);
      setMirrored(grid, midX, ex + 2, earBaseY - 2, 5);
      break;
    }
    case "mushroom": {
      // Mushroom cap ears
      const ex = earBaseHW - 2;
      setMirrored(grid, midX, ex, earBaseY - 1, 3);
      for (let dx = -1; dx <= 2; dx++) {
        setMirrored(grid, midX, ex + dx, earBaseY - 2, 5);
      }
      setMirrored(grid, midX, ex, earBaseY - 3, 5);
      setMirrored(grid, midX, ex + 1, earBaseY - 3, 5);
      break;
    }
    case "crystal": {
      // Crystalline angular ears
      const ex = earBaseHW;
      setMirrored(grid, midX, ex, earBaseY - 1, 4);
      setMirrored(grid, midX, ex + 1, earBaseY - 2, 4);
      setMirrored(grid, midX, ex, earBaseY - 3, 4);
      setMirrored(grid, midX, ex + 1, earBaseY - 1, 4);
      break;
    }
    case "feather": {
      // Feathery ear tufts
      const ex = earBaseHW;
      for (let dy = 1; dy <= 3; dy++) {
        setMirrored(grid, midX, ex + dy - 1, earBaseY - dy, 3);
        if (dy < 3) setMirrored(grid, midX, ex + dy, earBaseY - dy, 4);
      }
      break;
    }
    case "curl-horn": {
      // Curling ram horns
      const ex = earBaseHW;
      setMirrored(grid, midX, ex, earBaseY - 1, 5);
      setMirrored(grid, midX, ex + 1, earBaseY - 2, 5);
      setMirrored(grid, midX, ex + 2, earBaseY - 1, 5);
      setMirrored(grid, midX, ex + 2, earBaseY, 5);
      setMirrored(grid, midX, ex + 1, earBaseY + 1, 5);
      break;
    }
    case "droopy": {
      // Droopy long ears like a basset hound
      const ex = earBaseHW;
      setMirrored(grid, midX, ex, earBaseY - 1, 3);
      for (let dy = 0; dy < 5; dy++) {
        setMirrored(grid, midX, ex + 1, earBaseY + dy, 3);
      }
      setMirrored(grid, midX, ex, earBaseY + 4, 5);
      break;
    }
    case "none":
    default:
      break;
  }

  // ── 3. ARMS / LIMBS ──
  const armY = bodyTop + headRows + Math.round((bodyHeight - headRows) * 0.2);
  const armHW = halfWidths[headRows + Math.round((bodyHeight - headRows) * 0.2)] || maxHalfWidth;
  const sharpClaws = ferality > 0.6;

  switch (armType) {
    case "stubby": {
      // Short stubby arms
      setMirrored(grid, midX, armHW + 1, armY, 3);
      setMirrored(grid, midX, armHW + 1, armY + 1, 3);
      break;
    }
    case "flipper": {
      // Flipper/fin arms
      for (let dy = 0; dy < 3; dy++) {
        setMirrored(grid, midX, armHW + 1, armY + dy, 3);
      }
      setMirrored(grid, midX, armHW + 2, armY + 1, 3);
      setMirrored(grid, midX, armHW + 2, armY + 2, 3);
      break;
    }
    case "arms": {
      // Normal arms hanging down
      const armLen = 2 + Math.round(ferality * 2);
      for (let i = 0; i < armLen; i++) {
        setMirrored(grid, midX, armHW + 1, armY + i, 3);
      }
      // Hand/claw
      if (sharpClaws) {
        setMirrored(grid, midX, armHW + 2, armY + armLen - 1, 5);
        setMirrored(grid, midX, armHW + 1, armY + armLen, 5);
      } else {
        setMirrored(grid, midX, armHW + 1, armY + armLen, 3);
      }
      break;
    }
    case "tentacle": {
      // Wavy tentacle arms
      for (let i = 0; i < 4; i++) {
        const wave = Math.round(Math.sin(i * 1.5) * 0.8);
        setMirrored(grid, midX, armHW + 1 + wave, armY + i, 3);
      }
      setMirrored(grid, midX, armHW + 1, armY + 4, 5);
      break;
    }
    case "wing": {
      // Wing arms
      for (let dy = 0; dy < 4; dy++) {
        const wSpan = dy < 2 ? 3 : 2;
        for (let wx = 1; wx <= wSpan; wx++) {
          setMirrored(grid, midX, armHW + wx, armY + dy - 1, 3);
        }
      }
      // Wing highlight
      setMirrored(grid, midX, armHW + 2, armY - 1, 4);
      setMirrored(grid, midX, armHW + 3, armY, 4);
      break;
    }
    case "claw": {
      // Sharp claw arms
      for (let i = 0; i < 3; i++) setMirrored(grid, midX, armHW + 1, armY + i, 3);
      setMirrored(grid, midX, armHW + 2, armY + 2, 5);
      setMirrored(grid, midX, armHW + 2, armY + 3, 5);
      setMirrored(grid, midX, armHW + 1, armY + 3, 5);
      break;
    }
    case "paw": {
      // Round paw arms
      setMirrored(grid, midX, armHW + 1, armY, 3);
      setMirrored(grid, midX, armHW + 1, armY + 1, 3);
      setMirrored(grid, midX, armHW + 2, armY + 1, 3);
      setMirrored(grid, midX, armHW + 2, armY + 2, 4); // paw pad
      break;
    }
    case "branch": {
      // Tree branch arms
      setMirrored(grid, midX, armHW + 1, armY, 2);
      setMirrored(grid, midX, armHW + 2, armY - 1, 5);
      setMirrored(grid, midX, armHW + 2, armY, 2);
      setMirrored(grid, midX, armHW + 3, armY, 5);
      setMirrored(grid, midX, armHW + 3, armY + 1, 5);
      break;
    }
    case "ribbon-arm": {
      // Flowing ribbon arms
      for (let i = 0; i < 5; i++) {
        const wy = Math.round(Math.sin(i * 0.9) * 1);
        setMirrored(grid, midX, armHW + 1 + i, armY + wy, i < 2 ? 3 : 5);
      }
      break;
    }
    case "shield": {
      // Shield-like arms
      for (let dy = -1; dy <= 2; dy++) {
        setMirrored(grid, midX, armHW + 1, armY + dy, 3);
        setMirrored(grid, midX, armHW + 2, armY + dy, 2);
      }
      break;
    }
    case "nub": {
      // Tiny nub arms
      setMirrored(grid, midX, armHW + 1, armY, 3);
      break;
    }
    case "none":
    default:
      break;
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

  // ── 5. TAIL ──
  const tailSide = rng() > 0.5 ? 1 : -1;
  const tailStartRow = Math.round(bodyHeight * 0.6);
  const tailBaseY = bodyTop + tailStartRow;
  const tailBaseHW = halfWidths[Math.min(tailStartRow, bodyHeight - 1)] || 3;

  switch (tailStyle) {
    case "stub": {
      const tx = midX + tailSide * tailBaseHW;
      setIfEmpty(grid, tx, tailBaseY, 3);
      setIfEmpty(grid, tx + tailSide, tailBaseY, 3);
      break;
    }
    case "curl": {
      let tx = midX + tailSide * tailBaseHW;
      let ty = tailBaseY;
      for (let i = 0; i < 4; i++) {
        setIfEmpty(grid, tx, ty, 3);
        tx += tailSide;
        if (i >= 2) ty--;
      }
      setIfEmpty(grid, tx, ty, 5); // accent tip
      break;
    }
    case "flame": {
      let tx = midX + tailSide * tailBaseHW;
      for (let i = 0; i < 3; i++) {
        setIfEmpty(grid, tx + tailSide * i, tailBaseY - i, 5);
        if (i > 0) setIfEmpty(grid, tx + tailSide * i, tailBaseY - i + 1, 5);
      }
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY - 3, 4); // flame tip
      setIfEmpty(grid, tx + tailSide * 2, tailBaseY - 3, 4);
      break;
    }
    case "fish": {
      let tx = midX + tailSide * tailBaseHW;
      for (let i = 0; i < 3; i++) {
        setIfEmpty(grid, tx + tailSide * i, tailBaseY, 3);
      }
      // Fan
      tx += tailSide * 3;
      setIfEmpty(grid, tx, tailBaseY - 1, 5);
      setIfEmpty(grid, tx, tailBaseY, 5);
      setIfEmpty(grid, tx, tailBaseY + 1, 5);
      setIfEmpty(grid, tx + tailSide, tailBaseY - 1, 5);
      setIfEmpty(grid, tx + tailSide, tailBaseY + 1, 5);
      break;
    }
    case "ribbon": {
      let tx = midX + tailSide * tailBaseHW;
      for (let i = 0; i < 5; i++) {
        const wave = Math.round(Math.sin(i * 1.2) * 1);
        setIfEmpty(grid, tx + tailSide * i, tailBaseY + wave, 5);
      }
      break;
    }
    case "spike": {
      let tx = midX + tailSide * tailBaseHW;
      for (let i = 0; i < 3; i++) {
        setIfEmpty(grid, tx + tailSide * i, tailBaseY, 3);
      }
      // Spike tip
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY - 1, 5);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY, 5);
      break;
    }
    case "fluffy": {
      let tx = midX + tailSide * tailBaseHW;
      // Fluffy ball tail
      for (let dy = -1; dy <= 1; dy++) {
        for (let ddx = 0; ddx < 3; ddx++) {
          const xx = tx + tailSide * (ddx + 1);
          setIfEmpty(grid, xx, tailBaseY + dy, ddx === 1 && dy === 0 ? 4 : 3);
        }
      }
      break;
    }
    case "lightning": {
      const tx = midX + tailSide * tailBaseHW;
      setIfEmpty(grid, tx + tailSide, tailBaseY, 5);
      setIfEmpty(grid, tx + tailSide * 2, tailBaseY - 1, 5);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY, 5);
      setIfEmpty(grid, tx + tailSide * 4, tailBaseY - 1, 4);
      break;
    }
    case "heart": {
      const tx = midX + tailSide * tailBaseHW;
      setIfEmpty(grid, tx + tailSide, tailBaseY, 3);
      setIfEmpty(grid, tx + tailSide * 2, tailBaseY - 1, 5);
      setIfEmpty(grid, tx + tailSide * 2, tailBaseY + 1, 5);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY, 5);
      break;
    }
    case "star-tip": {
      const tx = midX + tailSide * tailBaseHW;
      setIfEmpty(grid, tx + tailSide, tailBaseY, 3);
      setIfEmpty(grid, tx + tailSide * 2, tailBaseY, 3);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY, 4);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY - 1, 4);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY + 1, 4);
      setIfEmpty(grid, tx + tailSide * 4, tailBaseY, 4);
      break;
    }
    case "swirl": {
      const tx = midX + tailSide * tailBaseHW;
      const pts: [number, number][] = [[1,0],[2,-1],[3,-1],[3,0],[2,1],[1,1],[1,0]];
      for (let i = 0; i < pts.length; i++) {
        setIfEmpty(grid, tx + tailSide * pts[i][0], tailBaseY + pts[i][1], i < 3 ? 3 : 5);
      }
      break;
    }
    case "split": {
      const tx = midX + tailSide * tailBaseHW;
      setIfEmpty(grid, tx + tailSide, tailBaseY, 3);
      setIfEmpty(grid, tx + tailSide * 2, tailBaseY, 3);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY - 1, 3);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY + 1, 3);
      setIfEmpty(grid, tx + tailSide * 4, tailBaseY - 2, 4);
      setIfEmpty(grid, tx + tailSide * 4, tailBaseY + 2, 4);
      break;
    }
    case "feathered": {
      const tx = midX + tailSide * tailBaseHW;
      for (let i = 0; i < 4; i++) {
        setIfEmpty(grid, tx + tailSide * (i + 1), tailBaseY, 3);
        if (i > 0 && i < 3) {
          setIfEmpty(grid, tx + tailSide * (i + 1), tailBaseY - 1, 4);
          setIfEmpty(grid, tx + tailSide * (i + 1), tailBaseY + 1, 4);
        }
      }
      break;
    }
    case "bubble": {
      const tx = midX + tailSide * tailBaseHW;
      setIfEmpty(grid, tx + tailSide, tailBaseY, 3);
      setIfEmpty(grid, tx + tailSide * 2, tailBaseY, 4);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY, 4);
      setIfEmpty(grid, tx + tailSide * 3, tailBaseY - 1, 4);
      break;
    }
    case "chain": {
      const tx = midX + tailSide * tailBaseHW;
      for (let i = 0; i < 4; i++) {
        setIfEmpty(grid, tx + tailSide * (i + 1), tailBaseY + (i % 2 === 0 ? 0 : -1), i % 2 === 0 ? 2 : 3);
      }
      break;
    }
    case "none":
    default:
      break;
  }

  // ── 6. EXTRA FEATURES ──
  switch (extraFeature) {
    case "horn-single": {
      // Single horn on top center
      for (let dy = 1; dy <= 3; dy++) {
        setIfEmpty(grid, midX, bodyTop - dy, 5);
        if (dy === 1) setIfEmpty(grid, midX - 1, bodyTop - dy, 5);
      }
      setIfEmpty(grid, midX, bodyTop - 4, 4);
      break;
    }
    case "horns-double": {
      const hx = Math.max(2, earBaseHW - 2);
      for (let dy = 1; dy <= 3; dy++) {
        setMirroredIfEmpty(grid, midX, hx, bodyTop - dy, 5);
      }
      setMirroredIfEmpty(grid, midX, hx, bodyTop - 4, 4);
      break;
    }
    case "crown": {
      const cw = Math.max(3, earBaseHW - 1);
      for (let dx = -cw; dx <= cw; dx++) {
        setIfEmpty(grid, midX + dx, bodyTop - 1, 5);
      }
      // Crown points
      setIfEmpty(grid, midX - cw + 1, bodyTop - 2, 5);
      setIfEmpty(grid, midX, bodyTop - 2, 5);
      setIfEmpty(grid, midX + cw - 1, bodyTop - 2, 5);
      setIfEmpty(grid, midX, bodyTop - 3, 4);
      break;
    }
    case "antenna-pair": {
      const ax = 2;
      for (let dy = 1; dy <= 3; dy++) {
        setMirroredIfEmpty(grid, midX, ax, bodyTop - dy, 3);
      }
      setMirroredIfEmpty(grid, midX, ax, bodyTop - 4, 5);
      break;
    }
    case "wings-small": {
      const wy = bodyTop + headRows + 1;
      const wBase = halfWidths[headRows + 1] || maxHalfWidth;
      for (let dy = 0; dy < 3; dy++) {
        setMirroredIfEmpty(grid, midX, wBase + 2, wy + dy, 4);
        if (dy < 2) setMirroredIfEmpty(grid, midX, wBase + 3, wy + dy, 4);
      }
      break;
    }
    case "wings-large": {
      const wy = bodyTop + headRows;
      const wBase = halfWidths[headRows] || maxHalfWidth;
      for (let dy = -1; dy < 4; dy++) {
        const span = dy < 1 ? 4 : dy < 3 ? 3 : 2;
        for (let wx = 1; wx <= span; wx++) {
          setMirroredIfEmpty(grid, midX, wBase + wx + 1, wy + dy, dy < 1 ? 4 : 3);
        }
      }
      break;
    }
    case "halo": {
      // Floating ring above head
      const haloY = bodyTop - 3;
      for (let dx = -2; dx <= 2; dx++) {
        setIfEmpty(grid, midX + dx, haloY, 5);
      }
      setIfEmpty(grid, midX - 3, haloY + 1, 5);
      setIfEmpty(grid, midX + 3, haloY + 1, 5);
      break;
    }
    case "leaf-sprout": {
      // Little sprout on top
      setIfEmpty(grid, midX, bodyTop - 1, 5);
      setIfEmpty(grid, midX - 1, bodyTop - 2, 5);
      setIfEmpty(grid, midX + 1, bodyTop - 2, 5);
      setIfEmpty(grid, midX - 1, bodyTop - 3, 5);
      setIfEmpty(grid, midX + 1, bodyTop - 3, 5);
      break;
    }
    case "bow": {
      // Cute bow on one ear
      const bx = midX + earBaseHW;
      setIfEmpty(grid, bx, bodyTop - 1, 5);
      setIfEmpty(grid, bx + 1, bodyTop - 2, 5);
      setIfEmpty(grid, bx + 1, bodyTop, 5);
      setIfEmpty(grid, bx, bodyTop - 2, 5);
      setIfEmpty(grid, bx, bodyTop, 5);
      break;
    }
    case "tiara": {
      // Small tiara on head
      for (let dx = -2; dx <= 2; dx++) {
        setIfEmpty(grid, midX + dx, bodyTop - 1, 5);
      }
      setIfEmpty(grid, midX, bodyTop - 2, 4);
      setIfEmpty(grid, midX - 1, bodyTop - 2, 5);
      setIfEmpty(grid, midX + 1, bodyTop - 2, 5);
      break;
    }
    case "mohawk": {
      // Spiky mohawk down the center
      for (let dy = 1; dy <= 4; dy++) {
        setIfEmpty(grid, midX, bodyTop - dy, dy <= 2 ? 5 : 4);
        if (dy <= 2) setIfEmpty(grid, midX - 1, bodyTop - dy, 5);
      }
      break;
    }
    case "flower": {
      // Flower on head
      setIfEmpty(grid, midX + earBaseHW - 1, bodyTop - 1, 5);
      setIfEmpty(grid, midX + earBaseHW, bodyTop - 2, 5);
      setIfEmpty(grid, midX + earBaseHW - 1, bodyTop - 2, 4);
      setIfEmpty(grid, midX + earBaseHW, bodyTop - 1, 5);
      setIfEmpty(grid, midX + earBaseHW - 2, bodyTop - 2, 5);
      break;
    }
    case "star-mark": {
      // Star mark on forehead
      setIfEmpty(grid, midX, bodyTop + 1, 4);
      setIfEmpty(grid, midX - 1, bodyTop + 2, 4);
      setIfEmpty(grid, midX + 1, bodyTop + 2, 4);
      setIfEmpty(grid, midX, bodyTop + 2, 4);
      break;
    }
    case "gem": {
      // Gem on forehead
      setIfEmpty(grid, midX, bodyTop + 1, 5);
      setIfEmpty(grid, midX, bodyTop + 2, 4);
      break;
    }
    case "scarf": {
      // Scarf around neck
      const neckY = bodyTop + headRows;
      for (let dx = -maxHalfWidth; dx < maxHalfWidth; dx++) {
        setIfEmpty(grid, midX + dx, neckY, 5);
      }
      // Dangling end
      setIfEmpty(grid, midX + maxHalfWidth, neckY + 1, 5);
      setIfEmpty(grid, midX + maxHalfWidth, neckY + 2, 5);
      break;
    }
    case "third-eye": {
      // Third eye on forehead
      setIfEmpty(grid, midX, bodyTop + 2, 6);
      setIfEmpty(grid, midX, bodyTop + 3, 7);
      break;
    }
    case "crest": {
      // Fan-shaped crest
      for (let dx = -2; dx <= 2; dx++) {
        setIfEmpty(grid, midX + dx, bodyTop - 1, 5);
        if (Math.abs(dx) <= 1) setIfEmpty(grid, midX + dx, bodyTop - 2, 5);
      }
      setIfEmpty(grid, midX, bodyTop - 3, 4);
      break;
    }
    case "cloud-puff": {
      // Cloud puff on head
      for (let dx = -1; dx <= 1; dx++) {
        setIfEmpty(grid, midX + dx, bodyTop - 1, 4);
        setIfEmpty(grid, midX + dx, bodyTop - 2, 4);
      }
      setIfEmpty(grid, midX - 2, bodyTop - 1, 4);
      setIfEmpty(grid, midX + 2, bodyTop - 1, 4);
      break;
    }
    case "sparkle-aura": {
      // Sparkle dots around the creature
      const spots: [number, number][] = [
        [-3, bodyTop - 1], [3, bodyTop], [-4, bodyTop + 3],
        [4, bodyTop + 4], [-2, bodyBottom + 2], [3, bodyBottom + 1],
      ];
      for (const [dx, sy] of spots) {
        setIfEmpty(grid, midX + dx, sy, 4);
      }
      break;
    }
    case "none":
    default:
      break;
  }

  // ── 6b. BODY MODIFIERS ──
  switch (bodyMod) {
    case "belly-patch": {
      // Lighter belly patch
      const bellyStart = bodyTop + headRows + 2;
      for (let dy = 0; dy < 3 && bellyStart + dy < bodyBottom; dy++) {
        const bw = Math.max(1, halfWidths[headRows + 2 + dy] - 2);
        for (let dx = 0; dx < bw; dx++) {
          setMirrored(grid, midX, dx, bellyStart + dy, 4);
        }
      }
      break;
    }
    case "collar": {
      // Collar ring around neck
      const neckY = bodyTop + headRows;
      const nw = halfWidths[headRows] || 3;
      for (let dx = 0; dx < nw + 1; dx++) {
        setMirrored(grid, midX, dx, neckY, 5);
      }
      break;
    }
    case "belt": {
      // Belt around waist
      const beltY = bodyTop + headRows + Math.floor((bodyHeight - headRows) * 0.5);
      const bw = halfWidths[beltY - bodyTop] || 3;
      for (let dx = 0; dx < bw; dx++) {
        setMirrored(grid, midX, dx, beltY, 2);
      }
      break;
    }
    case "cape": {
      // Small cape on back
      const capeY = bodyTop + headRows;
      for (let dy = 0; dy < 4 && capeY + dy <= bodyBottom + 1; dy++) {
        const cw = Math.min(maxHalfWidth + 1 + dy, 10);
        for (let dx = maxHalfWidth; dx < cw; dx++) {
          setMirrored(grid, midX, dx, capeY + dy, 2);
        }
      }
      break;
    }
    case "spikes-back": {
      // Spikes along the back
      for (let i = 0; i < 3; i++) {
        const sy = bodyTop + headRows + i * 2;
        if (sy < bodyBottom) {
          const sw = halfWidths[sy - bodyTop] || 3;
          setMirrored(grid, midX, sw + 1, sy, 5);
          setMirrored(grid, midX, sw + 1, sy - 1, 4);
        }
      }
      break;
    }
    case "shell": {
      // Shell on back (darker body region)
      const shellStart = bodyTop + headRows + 1;
      for (let dy = 0; dy < 4 && shellStart + dy < bodyBottom; dy++) {
        const sw = halfWidths[headRows + 1 + dy] || 3;
        for (let dx = Math.floor(sw * 0.3); dx < sw; dx++) {
          setMirrored(grid, midX, dx, shellStart + dy, 2);
        }
      }
      break;
    }
    case "mane": {
      // Mane around neck/head
      const maneY = bodyTop + headRows - 1;
      for (let dy = -1; dy <= 2; dy++) {
        const mw = (halfWidths[headRows + dy] || 3) + 1;
        setMirrored(grid, midX, mw, maneY + dy, 3);
        setMirrored(grid, midX, mw + 1, maneY + dy, 4);
      }
      break;
    }
    case "none":
    default:
      break;
  }

  // ── 7. PATTERNS ──
  // Apply patterns to body pixels only (cell === 3, main color)
  if (patternType !== "none") {
    for (let y = bodyTop; y <= bodyBottom; y++) {
      for (let x = 0; x < GRID; x++) {
        if (grid[y][x] !== 3) continue;
        let mark = false;
        const relY = (y - bodyTop) / Math.max(1, bodyHeight - 1);
        const relX = (x - midX) / 6;

        switch (patternType) {
          case "spots":
            mark = ((x * 7 + y * 13) % 11) < Math.round(surreality * 3);
            break;
          case "stripes-h":
            mark = (y % 3 === 0) && surreality > 0.3;
            break;
          case "stripes-v":
            mark = (x % 3 === 0) && surreality > 0.3;
            break;
          case "diamonds":
            mark = ((x + y) % 4 === 0) && surreality > 0.3;
            break;
          case "stars":
            mark = ((x * 5 + y * 3) % 13 === 0) && surreality > 0.35;
            break;
          case "dots-scattered":
            mark = ((x * 11 + y * 7) % 17 < 2) && surreality > 0.25;
            break;
          case "chevron":
            mark = ((x + y) % 4 === 0 || (x - y + 20) % 4 === 0) && surreality > 0.3;
            break;
          case "waves":
            mark = Math.round(Math.sin(x * 0.8) * 1.5 + y) % 3 === 0 && surreality > 0.3;
            break;
          case "scales":
            mark = ((x + (y % 2)) % 2 === 0) && (y % 2 === 0) && surreality > 0.25;
            break;
          case "hearts":
            mark = ((x * 3 + y * 7) % 19 === 0) && surreality > 0.35;
            break;
          case "zigzag":
            mark = (y % 2 === 0 ? x % 4 === 0 : x % 4 === 2) && surreality > 0.3;
            break;
          case "cross":
            mark = (x % 4 === 0 && y % 4 === 0) && surreality > 0.3;
            break;
          case "gradient":
            mark = relY > 0.5 && ((x + y) % 2 === 0);
            break;
        }
        if (mark) grid[y][x] = 5;
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

  // ── 9. EYES (from eyeStyle — 10 unique styles) ──
  const eyeRowOffset = Math.round(headRows * 0.45);
  const eyeY = bodyTop + eyeRowOffset + (frame === 1 ? -1 : 0);
  const eyeSpacing = Math.max(2, Math.floor(halfWidths[0] * 0.45));

  // Eye dimensions vary per style
  const isBigStyle = ["round", "wide", "cute-sparkle", "star-pupil", "heart-pupil"].includes(eyeStyle);
  const eyeW = isBigStyle ? 3 : 2;
  const eyeH = eyeStyle === "narrow" ? 1 : (isBigStyle ? 3 : 2);

  const leftEyeX = midX - eyeSpacing - Math.floor(eyeW / 2);
  const rightEyeX = midX + eyeSpacing - Math.floor(eyeW / 2);

  // Helper to draw one eye pair
  const drawEyePair = (style: EyeStyle) => {
    switch (style) {
      case "round": {
        // 3x3 classic round eyes with pupil and highlight
        for (let dy = 0; dy < 3; dy++)
          for (let dx = 0; dx < 3; dx++) {
            setCell(grid, leftEyeX + dx, eyeY + dy, 6);
            setCell(grid, rightEyeX + dx, eyeY + dy, 6);
          }
        // Pupil 2x2 bottom-left
        setCell(grid, leftEyeX, eyeY + 1, 7);
        setCell(grid, leftEyeX + 1, eyeY + 1, 7);
        setCell(grid, leftEyeX, eyeY + 2, 7);
        setCell(grid, leftEyeX + 1, eyeY + 2, 7);
        setCell(grid, rightEyeX + 1, eyeY + 1, 7);
        setCell(grid, rightEyeX + 2, eyeY + 1, 7);
        setCell(grid, rightEyeX + 1, eyeY + 2, 7);
        setCell(grid, rightEyeX + 2, eyeY + 2, 7);
        // Highlight top-right
        setCell(grid, leftEyeX + 2, eyeY, 6);
        setCell(grid, rightEyeX + 2, eyeY, 6);
        break;
      }
      case "oval": {
        // 2x3 tall oval eyes
        for (let dy = 0; dy < 3; dy++) {
          setCell(grid, leftEyeX, eyeY + dy, 6);
          setCell(grid, leftEyeX + 1, eyeY + dy, 6);
          setCell(grid, rightEyeX, eyeY + dy, 6);
          setCell(grid, rightEyeX + 1, eyeY + dy, 6);
        }
        // Pupil in lower half
        setCell(grid, leftEyeX, eyeY + 2, 7);
        setCell(grid, leftEyeX + 1, eyeY + 1, 7);
        setCell(grid, leftEyeX + 1, eyeY + 2, 7);
        setCell(grid, rightEyeX, eyeY + 1, 7);
        setCell(grid, rightEyeX, eyeY + 2, 7);
        setCell(grid, rightEyeX + 1, eyeY + 2, 7);
        // Highlight
        setCell(grid, leftEyeX, eyeY, 6);
        setCell(grid, rightEyeX + 1, eyeY, 6);
        break;
      }
      case "cute-sparkle": {
        // 3x3 big sparkly eyes with double highlight (classic Pokémon cute)
        for (let dy = 0; dy < 3; dy++)
          for (let dx = 0; dx < 3; dx++) {
            setCell(grid, leftEyeX + dx, eyeY + dy, 6);
            setCell(grid, rightEyeX + dx, eyeY + dy, 6);
          }
        // Iris color fills most of eye
        setCell(grid, leftEyeX, eyeY + 1, 10);
        setCell(grid, leftEyeX + 1, eyeY + 1, 10);
        setCell(grid, leftEyeX, eyeY + 2, 7);
        setCell(grid, leftEyeX + 1, eyeY + 2, 7);
        setCell(grid, leftEyeX + 2, eyeY + 2, 7);
        setCell(grid, rightEyeX + 1, eyeY + 1, 10);
        setCell(grid, rightEyeX + 2, eyeY + 1, 10);
        setCell(grid, rightEyeX, eyeY + 2, 7);
        setCell(grid, rightEyeX + 1, eyeY + 2, 7);
        setCell(grid, rightEyeX + 2, eyeY + 2, 7);
        // Double sparkle highlights — big + small
        setCell(grid, leftEyeX + 2, eyeY, 6);
        setCell(grid, leftEyeX, eyeY + 2, 6);
        setCell(grid, rightEyeX, eyeY, 6);
        setCell(grid, rightEyeX + 2, eyeY + 2, 6);
        break;
      }
      case "dot": {
        // Tiny 1x1 dot eyes — very minimal
        setCell(grid, leftEyeX, eyeY, 7);
        setCell(grid, rightEyeX + 1, eyeY, 7);
        break;
      }
      case "narrow": {
        // 2x1 slit eyes — sleepy/cool look
        setCell(grid, leftEyeX, eyeY, 7);
        setCell(grid, leftEyeX + 1, eyeY, 7);
        setCell(grid, rightEyeX, eyeY, 7);
        setCell(grid, rightEyeX + 1, eyeY, 7);
        break;
      }
      case "wide": {
        // 3x3 wide-open surprised eyes
        for (let dy = 0; dy < 3; dy++)
          for (let dx = 0; dx < 3; dx++) {
            setCell(grid, leftEyeX + dx, eyeY + dy, 6);
            setCell(grid, rightEyeX + dx, eyeY + dy, 6);
          }
        // Large centered pupil
        setCell(grid, leftEyeX + 1, eyeY + 1, 7);
        setCell(grid, leftEyeX + 1, eyeY + 2, 7);
        setCell(grid, rightEyeX + 1, eyeY + 1, 7);
        setCell(grid, rightEyeX + 1, eyeY + 2, 7);
        // Tiny highlight
        setCell(grid, leftEyeX + 2, eyeY, 6);
        setCell(grid, rightEyeX, eyeY, 6);
        break;
      }
      case "droopy": {
        // 2x2 eyes with droopy lower lid — cute sad look
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            setCell(grid, leftEyeX + dx, eyeY + dy, 6);
            setCell(grid, rightEyeX + dx, eyeY + dy, 6);
          }
        // Pupil bottom
        setCell(grid, leftEyeX, eyeY + 1, 7);
        setCell(grid, rightEyeX + 1, eyeY + 1, 7);
        // Droopy lid pixel on outside-bottom
        setCell(grid, leftEyeX - 1, eyeY + 1, 1);
        setCell(grid, rightEyeX + 2, eyeY + 1, 1);
        break;
      }
      case "fierce": {
        // 2x2 sharp angular eyes — determined look
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            setCell(grid, leftEyeX + dx, eyeY + dy, 6);
            setCell(grid, rightEyeX + dx, eyeY + dy, 6);
          }
        // Dark pupil fills inner half
        setCell(grid, leftEyeX + 1, eyeY, 7);
        setCell(grid, leftEyeX + 1, eyeY + 1, 7);
        setCell(grid, rightEyeX, eyeY, 7);
        setCell(grid, rightEyeX, eyeY + 1, 7);
        // Angry brow pixel above outer corner
        setCell(grid, leftEyeX - 1, eyeY - 1, 1);
        setCell(grid, leftEyeX, eyeY - 1, 1);
        setCell(grid, rightEyeX + 1, eyeY - 1, 1);
        setCell(grid, rightEyeX + 2, eyeY - 1, 1);
        break;
      }
      case "star-pupil": {
        // 3x3 eyes with star-shaped pupil
        for (let dy = 0; dy < 3; dy++)
          for (let dx = 0; dx < 3; dx++) {
            setCell(grid, leftEyeX + dx, eyeY + dy, 6);
            setCell(grid, rightEyeX + dx, eyeY + dy, 6);
          }
        // Star pupil: cross pattern in accent color
        setCell(grid, leftEyeX + 1, eyeY, 10);
        setCell(grid, leftEyeX, eyeY + 1, 10);
        setCell(grid, leftEyeX + 1, eyeY + 1, 7);
        setCell(grid, leftEyeX + 2, eyeY + 1, 10);
        setCell(grid, leftEyeX + 1, eyeY + 2, 10);
        setCell(grid, rightEyeX + 1, eyeY, 10);
        setCell(grid, rightEyeX, eyeY + 1, 10);
        setCell(grid, rightEyeX + 1, eyeY + 1, 7);
        setCell(grid, rightEyeX + 2, eyeY + 1, 10);
        setCell(grid, rightEyeX + 1, eyeY + 2, 10);
        break;
      }
      case "heart-pupil": {
        // 3x3 eyes with heart-shaped pupil
        for (let dy = 0; dy < 3; dy++)
          for (let dx = 0; dx < 3; dx++) {
            setCell(grid, leftEyeX + dx, eyeY + dy, 6);
            setCell(grid, rightEyeX + dx, eyeY + dy, 6);
          }
        // Heart shape: top bumps + bottom point
        setCell(grid, leftEyeX, eyeY, 9);
        setCell(grid, leftEyeX + 2, eyeY, 9);
        setCell(grid, leftEyeX, eyeY + 1, 9);
        setCell(grid, leftEyeX + 1, eyeY + 1, 9);
        setCell(grid, leftEyeX + 2, eyeY + 1, 9);
        setCell(grid, leftEyeX + 1, eyeY + 2, 9);
        setCell(grid, rightEyeX, eyeY, 9);
        setCell(grid, rightEyeX + 2, eyeY, 9);
        setCell(grid, rightEyeX, eyeY + 1, 9);
        setCell(grid, rightEyeX + 1, eyeY + 1, 9);
        setCell(grid, rightEyeX + 2, eyeY + 1, 9);
        setCell(grid, rightEyeX + 1, eyeY + 2, 9);
        break;
      }
    }
  };
  drawEyePair(eyeStyle);

  // ── 10. MOUTH (from mouthStyle) ──
  const mouthY = eyeY + eyeH + (isBigStyle ? 0 : 1);
  switch (mouthStyle) {
    case "smile":
      setCell(grid, midX - 1, mouthY, 8);
      setCell(grid, midX, mouthY, 8);
      break;
    case "fang":
      setCell(grid, midX - 1, mouthY, 8);
      setCell(grid, midX, mouthY, 8);
      setCell(grid, midX - 1, mouthY + 1, 6);
      break;
    case "cat-mouth":
      setCell(grid, midX, mouthY, 8);
      setCell(grid, midX - 1, mouthY + 1, 8);
      setCell(grid, midX + 1, mouthY + 1, 8);
      break;
    case "open":
      setCell(grid, midX - 1, mouthY, 8);
      setCell(grid, midX, mouthY, 8);
      setCell(grid, midX - 1, mouthY + 1, 8);
      setCell(grid, midX, mouthY + 1, 8);
      break;
    case "tongue-out":
      setCell(grid, midX - 1, mouthY, 8);
      setCell(grid, midX, mouthY, 8);
      setCell(grid, midX, mouthY + 1, 9); // tongue = blush color
      break;
    case "whistle":
      setCell(grid, midX, mouthY, 8);
      setCell(grid, midX, mouthY + 1, 8);
      break;
    case "pout":
      setCell(grid, midX - 1, mouthY, 8);
      setCell(grid, midX, mouthY, 8);
      setCell(grid, midX + 1, mouthY, 8);
      break;
    case "grin":
      setCell(grid, midX - 2, mouthY, 8);
      setCell(grid, midX - 1, mouthY, 8);
      setCell(grid, midX, mouthY, 8);
      setCell(grid, midX + 1, mouthY, 8);
      setCell(grid, midX - 2, mouthY - 1, 8);
      setCell(grid, midX + 1, mouthY - 1, 8);
      break;
    case "none":
      break;
    case "dot":
    default:
      setCell(grid, midX, mouthY, 8);
      break;
  }

  // ── 11. FACE MARKS (from faceMark) ──
  const blushY = eyeY + eyeH - 1;
  const blushSpread = eyeSpacing + eyeW;
  switch (faceMark) {
    case "blush":
      setMirrored(grid, midX, blushSpread, blushY, 9);
      setMirrored(grid, midX, blushSpread, blushY + 1, 9);
      break;
    case "freckles":
      setMirrored(grid, midX, blushSpread - 1, blushY, 2);
      setMirrored(grid, midX, blushSpread, blushY + 1, 2);
      setMirrored(grid, midX, blushSpread + 1, blushY, 2);
      break;
    case "whiskers":
      // 3 lines extending from cheeks
      for (let i = 0; i < 3; i++) {
        setMirrored(grid, midX, blushSpread + i, blushY - 1 + i, 1);
      }
      break;
    case "tear-mark":
      setMirrored(grid, midX, eyeSpacing, eyeY + eyeH, 5);
      setMirrored(grid, midX, eyeSpacing, eyeY + eyeH + 1, 5);
      break;
    case "scar":
      setMirrored(grid, midX, blushSpread, blushY - 1, 2);
      setMirrored(grid, midX, blushSpread, blushY, 2);
      setMirrored(grid, midX, blushSpread + 1, blushY + 1, 2);
      break;
    case "star-cheek":
      setMirrored(grid, midX, blushSpread, blushY, 4);
      setMirrored(grid, midX, blushSpread - 1, blushY, 4);
      setMirrored(grid, midX, blushSpread, blushY - 1, 4);
      break;
    case "swirl-cheek":
      setMirrored(grid, midX, blushSpread, blushY, 5);
      setMirrored(grid, midX, blushSpread + 1, blushY - 1, 5);
      setMirrored(grid, midX, blushSpread + 1, blushY, 5);
      break;
    case "none":
    default:
      break;
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
