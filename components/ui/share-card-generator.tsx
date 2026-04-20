"use client";

/**
 * ShareCardGenerator — Premium TCG-style share card compositor.
 *
 * Upgrades over ViralShareCard:
 *  - Spaced typographic rarity badge  [ L E G E N D A R Y ]  (metallic gradient)
 *  - Episode memory quote rendered as a luxury caption block
 *  - Adaptive canvas size (600×840 mobile / 800×1120 desktop)
 *  - createImageBitmap fast path for WebGL frame capture (~3× faster than Image)
 *
 * Capture pipeline:
 *   gl.domElement (preserveDrawingBuffer=true)
 *     → createImageBitmap()          (async decode, off-main-thread)
 *     → offscreen Canvas2D composite
 *     → PNG toDataURL
 *     → Web Share API (files) | download fallback
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DNA_AXES } from "@/lib/genome/dna";
import type { RareMutation, RarityTier } from "@/lib/cron-core/openclaw-dna";

// ── Rarity visual tokens (exported so void-canvas-inner can reuse) ────────────
export const RARITY_COLOR: Record<RarityTier, string> = {
  Common:    "#9ca3af",
  Rare:      "#60a5fa",
  Epic:      "#c084fc",
  Legendary: "#fbbf24",
};

export const RARITY_GLOW: Record<RarityTier, string> = {
  Common:    "rgba(156,163,175,0.20)",
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

// ── Canvas helpers ─────────────────────────────────────────────────────────────

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

/** Draw a 16-axis spider/radar chart. */
function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  dna: CreatureDNA,
  cx: number, cy: number, r: number,
  accentHex: string,
): void {
  const n = DNA_AXES.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;

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
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + ring * 0.02})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const rr = parseInt(accentHex.slice(1, 3), 16);
  const gg = parseInt(accentHex.slice(3, 5), 16);
  const bb = parseInt(accentHex.slice(5, 7), 16);

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    const v = dna[DNA_AXES[i]];
    const px = cx + r * v * Math.cos(a);
    const py = cy + r * v * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(${rr},${gg},${bb},0.18)`;
  ctx.fill();
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    const v = dna[DNA_AXES[i]];
    ctx.beginPath();
    ctx.arc(cx + r * v * Math.cos(a), cy + r * v * Math.sin(a), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = accentHex;
    ctx.fill();
  }

  ctx.font = "bold 9px SF Mono,Menlo,monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    const lr = r + 18;
    ctx.fillStyle = "rgba(255,255,255,0.40)";
    ctx.fillText(AXIS_ABBR[DNA_AXES[i]], cx + lr * Math.cos(a), cy + lr * Math.sin(a));
  }
}

/**
 * Draw the typographic rarity badge  [ L E G E N D A R Y ]
 * Uses metallic gradient fill for Epic/Legendary, solid accent for Rare/Common.
 */
function drawRarityBadge(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  tier: RarityTier,
  accentHex: string,
  cardW: number,
): void {
  const label = `[ ${tier.toUpperCase().split("").join(" ")} ]`;

  ctx.save();
  ctx.font = "bold 11px SF Mono,Menlo,monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Letter-spacing: Chrome 99+ / Safari 17+ supports ctx.letterSpacing
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = "0.28em";

  if (tier === "Legendary") {
    // Gold gradient sweep + glow
    const grad = ctx.createLinearGradient(cx - cardW * 0.18, cy, cx + cardW * 0.18, cy);
    grad.addColorStop(0,   "#fde68a");
    grad.addColorStop(0.3, "#fbbf24");
    grad.addColorStop(0.7, "#f59e0b");
    grad.addColorStop(1,   "#fde68a");
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(251,191,36,0.90)";
    ctx.shadowBlur   = 14;
  } else if (tier === "Epic") {
    const grad = ctx.createLinearGradient(cx - cardW * 0.12, cy, cx + cardW * 0.12, cy);
    grad.addColorStop(0,   "#e879f9");
    grad.addColorStop(0.5, "#c084fc");
    grad.addColorStop(1,   "#a855f7");
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(192,132,252,0.75)";
    ctx.shadowBlur   = 10;
  } else if (tier === "Rare") {
    const grad = ctx.createLinearGradient(cx - cardW * 0.10, cy, cx + cardW * 0.10, cy);
    grad.addColorStop(0,   "#93c5fd");
    grad.addColorStop(0.5, "#60a5fa");
    grad.addColorStop(1,   "#3b82f6");
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(96,165,250,0.55)";
    ctx.shadowBlur   = 7;
  } else {
    ctx.fillStyle = accentHex;
  }

  ctx.fillText(label, cx, cy);

  // Thin horizontal rules flanking the badge for luxury certificate look
  if (tier !== "Common") {
    const rr = parseInt(accentHex.slice(1, 3), 16);
    const gg = parseInt(accentHex.slice(3, 5), 16);
    const bb = parseInt(accentHex.slice(5, 7), 16);
    const lineY = cy - 12;
    const lineW = cardW * 0.28;
    ctx.strokeStyle = `rgba(${rr},${gg},${bb},0.30)`;
    ctx.lineWidth = 0.5;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(cx - lineW, lineY);
    ctx.lineTo(cx - 50, lineY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 50, lineY);
    ctx.lineTo(cx + lineW, lineY);
    ctx.stroke();
  }

  ctx.restore();
}

/** Draw episode memory quote block. Returns height consumed. */
function drawMemoryBlock(
  ctx: CanvasRenderingContext2D,
  cx: number, curY: number,
  memoryText: string,
  accentHex: string,
  cardW: number,
  locale: string,
): number {
  const rr = parseInt(accentHex.slice(1, 3), 16);
  const gg = parseInt(accentHex.slice(3, 5), 16);
  const bb = parseInt(accentHex.slice(5, 7), 16);

  // Accent left bar
  ctx.fillStyle = `rgba(${rr},${gg},${bb},0.50)`;
  ctx.fillRect(cx - cardW * 0.32, curY - 2, 2, 34);

  // Truncate to 52 chars
  const display = memoryText.length > 52 ? memoryText.slice(0, 52) + "…" : memoryText;

  ctx.font = "italic 13px SF Pro Display,-apple-system,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.fillText(`"${display}"`, cx, curY + 8);

  // Attribution
  ctx.font = "10px SF Mono,Menlo,monospace";
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillText(locale === "ko" ? "— 기억의 파편" : "— Memory Fragment", cx, curY + 26);

  return 48;
}

// ── Card compositor ────────────────────────────────────────────────────────────

async function composeCard(
  glCanvas: HTMLCanvasElement,
  dna: CreatureDNA,
  speciesName: string,
  mutation: RareMutation | null | undefined,
  rarityTier: RarityTier,
  genLevel: number,
  memoryText: string | undefined,
  locale: string,
): Promise<string> {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const CARD_W  = isMobile ? 600 : 800;
  const CARD_H  = isMobile ? 840 : 1120;
  const STARS   = isMobile ? 80  : 150;

  const accent = RARITY_COLOR[rarityTier];
  const glow   = RARITY_GLOW[rarityTier];
  const rr = parseInt(accent.slice(1, 3), 16);
  const gg = parseInt(accent.slice(3, 5), 16);
  const bb = parseInt(accent.slice(5, 7), 16);

  const canvas = document.createElement("canvas");
  canvas.width  = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // ── Background ──────────────────────────────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.35, 0, CARD_W / 2, CARD_H * 0.35, CARD_W);
  bgGrad.addColorStop(0.0, "#1c0f3a");
  bgGrad.addColorStop(0.5, "#0d0820");
  bgGrad.addColorStop(1.0, "#04030d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Star field (deterministic) ──────────────────────────────────────────────
  for (let i = 0; i < STARS; i++) {
    const sx  = (Math.sin(i * 127.1 + 1.4) * 0.5 + 0.5) * CARD_W;
    const sy  = (Math.sin(i * 311.7 + 0.9) * 0.5 + 0.5) * CARD_H;
    const sr  = (Math.sin(i * 74.7)  * 0.5 + 0.5) * 1.4 + 0.3;
    const sa  = (Math.sin(i * 55.3)  * 0.5 + 0.5) * 0.50 + 0.1;
    ctx.globalAlpha = sa;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Border glow ─────────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur  = 42;
  ctx.strokeStyle = accent;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  rrectPath(ctx, 14, 14, CARD_W - 28, CARD_H - 28, 22);
  ctx.stroke();
  ctx.restore();

  // ── Inner panel ─────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  rrectPath(ctx, 18, 18, CARD_W - 36, CARD_H - 36, 18);
  ctx.fill();

  // ── Creature screenshot — createImageBitmap fast path ───────────────────────
  let imgSource: CanvasImageSource;
  try {
    imgSource = await createImageBitmap(glCanvas);
  } catch {
    // Fallback: synchronous Image object
    imgSource = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = glCanvas.toDataURL("image/png");
    });
  }

  const imgAreaH = Math.round(CARD_H * 0.473);  // ~530 / 1120 × CARD_H
  const imgAreaW = CARD_W - 52;

  ctx.save();
  ctx.beginPath();
  rrectPath(ctx, 26, 26, imgAreaW, imgAreaH, 14);
  ctx.clip();

  const scale  = Math.max(imgAreaW / (imgSource.width as number), imgAreaH / (imgSource.height as number));
  const drawW  = (imgSource.width  as number) * scale;
  const drawH  = (imgSource.height as number) * scale;
  const drawX  = 26 + (imgAreaW - drawW) / 2;
  const drawY  = 26 + (imgAreaH - drawH) / 2;
  ctx.drawImage(imgSource, drawX, drawY, drawW, drawH);

  // Fade bottom of screenshot into background
  const fadeGrad = ctx.createLinearGradient(0, imgAreaH - 80 + 26, 0, imgAreaH + 26);
  fadeGrad.addColorStop(0, "rgba(8,4,20,0)");
  fadeGrad.addColorStop(1, "rgba(6,3,16,0.96)");
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(26, 26, imgAreaW, imgAreaH);
  ctx.restore();

  if (imgSource instanceof ImageBitmap) imgSource.close();

  // ── Legendary shimmer stripe ─────────────────────────────────────────────────
  if (rarityTier === "Legendary") {
    const shimmer = ctx.createLinearGradient(0, 26, CARD_W, 26 + imgAreaH);
    shimmer.addColorStop(0,   "rgba(251,191,36,0)");
    shimmer.addColorStop(0.4, "rgba(251,191,36,0.05)");
    shimmer.addColorStop(0.6, "rgba(251,191,36,0.11)");
    shimmer.addColorStop(1,   "rgba(251,191,36,0)");
    ctx.fillStyle = shimmer;
    ctx.beginPath();
    rrectPath(ctx, 26, 26, imgAreaW, imgAreaH, 14);
    ctx.fill();
  }

  // ── Text section ─────────────────────────────────────────────────────────────
  let curY = imgAreaH + 26 + 36;

  // Species name
  ctx.font         = "bold 26px SF Pro Display,-apple-system,sans-serif";
  ctx.textAlign    = "center";
  ctx.fillStyle    = "rgba(255,255,255,0.90)";
  ctx.fillText(speciesName, CARD_W / 2, curY);
  curY += 36;

  // Memory quote block (if present)
  if (memoryText) {
    curY += drawMemoryBlock(ctx, CARD_W / 2, curY, memoryText, accent, CARD_W, locale);
  }

  // Mutation name (if present)
  if (mutation) {
    ctx.save();
    ctx.font        = "bold 16px SF Pro Display,-apple-system,sans-serif";
    ctx.fillStyle   = accent;
    ctx.shadowColor = `rgba(${rr},${gg},${bb},0.80)`;
    ctx.shadowBlur  = 16;
    ctx.textAlign   = "center";
    ctx.fillText(`✦ ${mutation.mutationName} ✦`, CARD_W / 2, curY);
    ctx.restore();
    curY += 30;
  }

  // Typographic rarity badge
  curY += 10;
  drawRarityBadge(ctx, CARD_W / 2, curY, rarityTier, accent, CARD_W);
  curY += 28;

  // Generation pill (small, right-aligned)
  ctx.font      = "bold 9px SF Mono,Menlo,monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(148,163,184,0.60)";
  ctx.fillText(`GEN ${genLevel}`, CARD_W - 38, curY - 14);

  curY += 22;

  // 16-axis radar chart
  const radarScale = isMobile ? 0.875 : 1;
  const radarR     = Math.round(140 * radarScale);
  const radarCY    = curY + radarR + 18;
  drawRadarChart(ctx, dna, CARD_W / 2, radarCY, radarR, accent);
  curY = radarCY + radarR + 28;

  // GYEOL watermark
  ctx.font      = "11px SF Mono,Menlo,monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.20)";
  ctx.fillText("GYEOL · gyeol.app", CARD_W / 2, CARD_H - 22);

  return canvas.toDataURL("image/png");
}

// ── React component ────────────────────────────────────────────────────────────

export interface ShareCardGeneratorProps {
  dna: CreatureDNA;
  speciesName: string;
  mutation?: RareMutation | null;
  rarityTier?: RarityTier;
  genLevel?: number;
  /** Latest episodes.content for this agent — displayed as a memory quote */
  memoryText?: string;
  /** Return the R3F WebGL canvas (must have preserveDrawingBuffer: true) */
  getCanvas: () => HTMLCanvasElement | null;
  onClose: () => void;
  locale?: string;
}

export function ShareCardGenerator({
  dna,
  speciesName,
  mutation,
  rarityTier = "Common",
  genLevel = 1,
  memoryText,
  getCanvas,
  onClose,
  locale = "ko",
}: ShareCardGeneratorProps) {
  const [composedImage, setComposedImage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const isKo   = locale === "ko";
  const accent = RARITY_COLOR[rarityTier];

  useEffect(() => {
    let cancelled = false;
    const tryCompose = async (attempt = 0) => {
      const glCanvas = getCanvas();
      if (!glCanvas) {
        if (attempt < 3) requestAnimationFrame(() => { if (!cancelled) void tryCompose(attempt + 1); });
        return;
      }
      const dataUrl = await composeCard(glCanvas, dna, speciesName, mutation, rarityTier, genLevel, memoryText, locale);
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

      const shareText = isKo
        ? `내 피조물 ${speciesName}가 ${rarityTier} 등급으로 각성했다${mutation ? ` (${mutation.mutationName})` : ""} #GYEOL`
        : `My creature ${speciesName} awakened to ${rarityTier} tier${mutation ? ` (${mutation.mutationName})` : ""} #GYEOL`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${speciesName} — GYEOL`, text: shareText, files: [file] });
      } else {
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
  }, [composedImage, speciesName, rarityTier, mutation, isKo]);

  const CARD_ASPECT = 800 / 1120;

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
        {/* Card preview */}
        <div
          className="mb-3 overflow-hidden rounded-xl border border-white/10"
          style={{ aspectRatio: `${CARD_ASPECT}` }}
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
                className="w-6 h-6 rounded-full border-2 border-white/20 animate-spin"
                style={{ borderTopColor: accent }}
              />
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="mb-3 flex items-center justify-center gap-2 text-xs">
          <span className="font-bold tracking-widest" style={{ color: accent }}>
            {rarityTier.toUpperCase()}
          </span>
          <span className="text-white/25">·</span>
          <span className="text-white/40">Gen {genLevel}</span>
          {mutation && (
            <>
              <span className="text-white/25">·</span>
              <span className="text-white/50 truncate max-w-[110px]">{mutation.mutationName}</span>
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
