"use client";

/**
 * Viral Share Card — TCG-style digital card for rare creature mutations.
 *
 * Composes: R3F canvas screenshot + 16-axis radar chart + mutation badge
 *           + rarity tier + generation tag → single PNG via Canvas2D.
 *
 * Black screen prevention: requires Canvas rendered with preserveDrawingBuffer: true.
 * Capture sequence: gl.domElement.toDataURL() → offscreen Canvas2D composition
 *                   → <img> preview → Web Share API (files) or download fallback.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DNA_AXES } from "@/lib/genome/dna";
import type { RareMutation, RarityTier } from "@/lib/cron-core/openclaw-dna";

// ── Rarity visual tokens ──────────────────────────────────────────────────────
const RARITY_COLOR: Record<RarityTier, string> = {
  Common:    "#9ca3af",
  Rare:      "#60a5fa",
  Epic:      "#c084fc",
  Legendary: "#fbbf24",
};

const RARITY_GLOW: Record<RarityTier, string> = {
  Common:    "rgba(156,163,175,0.25)",
  Rare:      "rgba(96,165,250,0.45)",
  Epic:      "rgba(192,132,252,0.55)",
  Legendary: "rgba(251,191,36,0.70)",
};

// Three-letter axis abbreviations for the radar chart labels
const AXIS_ABBR: Record<string, string> = {
  analytical: "ANL", intuitive: "INT", verbal: "VRB", spatial: "SPA",
  warmth:     "WRM", intensity: "ITN", stability: "STB", openness: "OPN",
  assertiveness: "AST", empathy: "EMP", playfulness: "PLY", independence: "IND",
  curiosity:  "CUR", persistence: "PER", adaptability: "ADP", creativity: "CRE",
};

// ── Canvas helpers ────────────────────────────────────────────────────────────

/** Draw a rounded rectangle path (compatible with all modern browsers). */
function rrectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Draw a 16-axis spider/radar chart onto ctx. */
function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  dna: CreatureDNA,
  cx: number, cy: number, r: number,
  accentHex: string,
): void {
  const n = DNA_AXES.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;

  // Background grid rings (5 levels)
  for (let ring = 1; ring <= 5; ring++) {
    const rr = r * (ring / 5);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = start + i * step;
      const px = cx + rr * Math.cos(a);
      const py = cy + rr * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + ring * 0.022})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Axis spokes
  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Parse hex → rgb for rgba fills
  const rr = parseInt(accentHex.slice(1, 3), 16);
  const gg = parseInt(accentHex.slice(3, 5), 16);
  const bb = parseInt(accentHex.slice(5, 7), 16);

  // DNA polygon fill + stroke
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    const v = dna[DNA_AXES[i]];
    const px = cx + r * v * Math.cos(a);
    const py = cy + r * v * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(${rr},${gg},${bb},0.22)`;
  ctx.fill();
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Vertex dots
  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    const v = dna[DNA_AXES[i]];
    ctx.beginPath();
    ctx.arc(cx + r * v * Math.cos(a), cy + r * v * Math.sin(a), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = accentHex;
    ctx.fill();
  }

  // Axis labels (outside ring)
  ctx.font = "bold 9px SF Mono,Menlo,monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    const lr = r + 18;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(AXIS_ABBR[DNA_AXES[i]], cx + lr * Math.cos(a), cy + lr * Math.sin(a));
  }
}

/** Draw a pill-shaped badge with label. Returns the badge width for layout. */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  label: string,
  color: string,
): void {
  const rr = parseInt(color.slice(1, 3), 16);
  const gg = parseInt(color.slice(3, 5), 16);
  const bb = parseInt(color.slice(5, 7), 16);

  ctx.font = "bold 10px SF Mono,Menlo,monospace";
  const tw = ctx.measureText(label).width;
  const bw = tw + 20;
  const bh = 20;
  const bx = cx - bw / 2;
  const by = cy - bh / 2;

  ctx.beginPath();
  rrectPath(ctx, bx, by, bw, bh, 5);
  ctx.fillStyle = `rgba(${rr},${gg},${bb},0.18)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${rr},${gg},${bb},0.7)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy);
}

// ── Card compositor ───────────────────────────────────────────────────────────

const CARD_W = 800;
const CARD_H = 1120;

function composeCard(
  glCanvas: HTMLCanvasElement,
  dna: CreatureDNA,
  speciesName: string,
  mutation: RareMutation | null | undefined,
  rarityTier: RarityTier,
  genLevel: number,
): Promise<string> {
  return new Promise((resolve) => {
    const accent = RARITY_COLOR[rarityTier];
    const glow   = RARITY_GLOW[rarityTier];
    const rr = parseInt(accent.slice(1, 3), 16);
    const gg = parseInt(accent.slice(3, 5), 16);
    const bb = parseInt(accent.slice(5, 7), 16);

    const canvas = document.createElement("canvas");
    canvas.width  = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) { resolve(""); return; }

    // ── Background: deep space radial gradient ──────────────────────────────
    const bgGrad = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.35, 0, CARD_W / 2, CARD_H * 0.35, CARD_W);
    bgGrad.addColorStop(0.0, "#1c0f3a");
    bgGrad.addColorStop(0.5, "#0d0820");
    bgGrad.addColorStop(1.0, "#04030d");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // ── Star field (seeded, deterministic) ──────────────────────────────────
    for (let i = 0; i < 150; i++) {
      const sx  = (Math.sin(i * 127.1 + 1.4) * 0.5 + 0.5) * CARD_W;
      const sy  = (Math.sin(i * 311.7 + 0.9) * 0.5 + 0.5) * CARD_H;
      const sr  = (Math.sin(i * 74.7)  * 0.5 + 0.5) * 1.4 + 0.3;
      const sa  = (Math.sin(i * 55.3)  * 0.5 + 0.5) * 0.55 + 0.1;
      ctx.globalAlpha = sa;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Card border glow ─────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur  = 40;
    ctx.strokeStyle = accent;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    rrectPath(ctx, 14, 14, CARD_W - 28, CARD_H - 28, 22);
    ctx.stroke();
    ctx.restore();

    // ── Inner dark panel ─────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    rrectPath(ctx, 18, 18, CARD_W - 36, CARD_H - 36, 18);
    ctx.fill();

    // ── Creature screenshot ───────────────────────────────────────────────────
    const creatureDataUrl = glCanvas.toDataURL("image/png");
    const img = new Image();

    img.onload = () => {
      const imgAreaH = 530;
      const imgAreaW = CARD_W - 52;

      // Clip to image area with rounded corners
      ctx.save();
      ctx.beginPath();
      rrectPath(ctx, 26, 26, imgAreaW, imgAreaH, 14);
      ctx.clip();

      // Scale + centre the creature screenshot
      const scale     = Math.max(imgAreaW / img.width, imgAreaH / img.height);
      const drawW     = img.width  * scale;
      const drawH     = img.height * scale;
      const drawX     = 26 + (imgAreaW - drawW) / 2;
      const drawY     = 26 + (imgAreaH - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Fade bottom of screenshot into the card background
      const fadeGrad = ctx.createLinearGradient(0, imgAreaH - 80 + 26, 0, imgAreaH + 26);
      fadeGrad.addColorStop(0, "rgba(8,4,20,0)");
      fadeGrad.addColorStop(1, "rgba(6,3,16,0.96)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(26, 26, imgAreaW, imgAreaH);
      ctx.restore();

      // ── Rarity shimmer stripe (Legendary only) ───────────────────────────
      if (rarityTier === "Legendary") {
        const shimmer = ctx.createLinearGradient(0, 26, CARD_W, 26 + imgAreaH);
        shimmer.addColorStop(0,   "rgba(251,191,36,0)");
        shimmer.addColorStop(0.4, "rgba(251,191,36,0.06)");
        shimmer.addColorStop(0.6, "rgba(251,191,36,0.12)");
        shimmer.addColorStop(1,   "rgba(251,191,36,0)");
        ctx.fillStyle = shimmer;
        ctx.beginPath();
        rrectPath(ctx, 26, 26, imgAreaW, imgAreaH, 14);
        ctx.fill();
      }

      // ── Species name ──────────────────────────────────────────────────────
      let curY = imgAreaH + 26 + 36;
      ctx.font         = "bold 26px SF Pro Display,-apple-system,sans-serif";
      ctx.textAlign    = "center";
      ctx.fillStyle    = "rgba(255,255,255,0.90)";
      ctx.fillText(speciesName, CARD_W / 2, curY);
      curY += 34;

      // ── Mutation name (if present) ────────────────────────────────────────
      if (mutation) {
        ctx.save();
        ctx.font         = "bold 18px SF Pro Display,-apple-system,sans-serif";
        ctx.fillStyle    = accent;
        ctx.shadowColor  = `rgba(${rr},${gg},${bb},0.8)`;
        ctx.shadowBlur   = 18;
        ctx.textAlign    = "center";
        ctx.fillText(`✦ ${mutation.mutationName} ✦`, CARD_W / 2, curY);
        ctx.restore();
        curY += 32;
      }

      // ── Badges: rarity tier + generation ─────────────────────────────────
      drawBadge(ctx, CARD_W / 2 - 88, curY,  `◆ ${rarityTier.toUpperCase()}`, accent);
      drawBadge(ctx, CARD_W / 2 + 78, curY,  `GEN ${genLevel}`,              "#94a3b8");
      curY += 46;

      // ── 16-axis radar chart ───────────────────────────────────────────────
      const radarR  = 140;
      const radarCY = curY + radarR + 22;
      drawRadarChart(ctx, dna, CARD_W / 2, radarCY, radarR, accent);
      curY = radarCY + radarR + 30;

      // ── GYEOL watermark ───────────────────────────────────────────────────
      ctx.font      = "11px SF Mono,Menlo,monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillText("GYEOL · gyeol.app", CARD_W / 2, CARD_H - 24);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => resolve("");
    img.src = creatureDataUrl;
  });
}

// ── React component ───────────────────────────────────────────────────────────

export interface ViralShareCardProps {
  dna: CreatureDNA;
  speciesName: string;
  mutation?: RareMutation | null;
  rarityTier?: RarityTier;
  genLevel?: number;
  /** Return the R3F WebGL canvas DOM element — must be rendered with preserveDrawingBuffer: true */
  getCanvas: () => HTMLCanvasElement | null;
  onClose: () => void;
  locale?: string;
}

export function ViralShareCard({
  dna,
  speciesName,
  mutation,
  rarityTier = "Common",
  genLevel = 1,
  getCanvas,
  onClose,
  locale = "ko",
}: ViralShareCardProps) {
  const [composedImage, setComposedImage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const isKo = locale === "ko";
  const accent = RARITY_COLOR[rarityTier];

  // Compose card once on mount (requestAnimationFrame ensures WebGL has rendered)
  useEffect(() => {
    let cancelled = false;
    const tryCompose = async (attempt = 0) => {
      const glCanvas = getCanvas();
      if (!glCanvas) {
        // Canvas not yet in DOM — retry after next paint (max 3 attempts)
        if (attempt < 3) {
          requestAnimationFrame(() => { if (!cancelled) void tryCompose(attempt + 1); });
        }
        return;
      }
      const dataUrl = await composeCard(glCanvas, dna, speciesName, mutation, rarityTier, genLevel);
      if (!cancelled && dataUrl) setComposedImage(dataUrl);
    };
    void tryCompose();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = useCallback(async () => {
    if (!composedImage) return;
    setSharing(true);
    try {
      const res  = await fetch(composedImage);
      const blob = await res.blob();
      const fname = `gyeol-${speciesName.replace(/\s+/g, "-").toLowerCase()}.png`;
      const file  = new File([blob], fname, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${speciesName} — GYEOL`,
          text: isKo
            ? `내 피조물 ${speciesName}${mutation ? ` (${mutation.mutationName})` : ""} #GYEOL #피조물`
            : `My creature ${speciesName}${mutation ? ` (${mutation.mutationName})` : ""} #GYEOL`,
          files: [file],
        });
      } else {
        // Fallback: trigger browser download
        const a = document.createElement("a");
        a.href     = composedImage;
        a.download = fname;
        a.click();
      }
    } catch {
      // User dismissed share sheet — not an error
    } finally {
      setSharing(false);
    }
  }, [composedImage, speciesName, mutation, isKo]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-xs rounded-2xl bg-[#06040f] p-4 shadow-2xl"
        style={{ border: `1px solid ${accent}44` }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{ scale: 0.92,    opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Card preview (8:11 aspect ratio — portrait) */}
        <div
          className="mb-3 overflow-hidden rounded-xl border border-white/10"
          style={{ aspectRatio: `${CARD_W}/${CARD_H}` }}
        >
          {composedImage ? (
            <img
              src={composedImage}
              alt={`${speciesName} share card`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/60">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-white/80 border-white/20 animate-spin"
                style={{ borderTopColor: accent }}
              />
            </div>
          )}
        </div>

        {/* Rarity + gen metadata */}
        <div className="mb-3 flex items-center justify-center gap-2 text-xs">
          <span className="font-bold" style={{ color: accent }}>◆ {rarityTier}</span>
          <span className="text-white/25">·</span>
          <span className="text-white/40">Gen {genLevel}</span>
          {mutation && (
            <>
              <span className="text-white/25">·</span>
              <span className="text-white/50 truncate max-w-[120px]">{mutation.mutationName}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl py-2.5 bg-white/[0.05] text-sm text-white/55 hover:bg-white/10 transition-colors"
            onClick={onClose}
          >
            {isKo ? "닫기" : "Close"}
          </button>
          <button
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-black transition-all disabled:opacity-40"
            style={{ backgroundColor: accent }}
            onClick={handleShare}
            disabled={!composedImage || sharing}
          >
            {sharing ? "···" : isKo ? "공유하기" : "Share"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
