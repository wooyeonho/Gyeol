"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic, playSound } from "@/lib/micro-interactions";
import { FocusTrap } from "@/components/focus-trap";

/* ── Types ── */

export type CelebrationVariant = "confetti" | "sparkle" | "firework";

export interface CelebrationReward {
  type: string;
  amount: number;
  icon: string;
}

export interface CelebrationOverlayProps {
  show: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  reward?: CelebrationReward;
  variant?: CelebrationVariant;
  /** Auto-dismiss delay in ms (default 3000). Set 0 to disable. */
  autoDismissMs?: number;
  children?: ReactNode;
}

/* ── Particle system ── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
  shape: "rect" | "star" | "circle";
}

const CELEBRATION_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#10b981", // emerald
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#ffffff", // white
];

function randomColor(): string {
  return CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];
}

function createConfettiParticles(w: number, h: number): Particle[] {
  const count = 80;
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: -10 - Math.random() * h * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 1.5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      width: Math.random() * 8 + 4,
      height: Math.random() * 4 + 2,
      color: randomColor(),
      opacity: 1,
      life: 0,
      maxLife: 120 + Math.random() * 80,
      shape: "rect",
    });
  }
  return particles;
}

function createSparkleParticles(w: number, h: number): Particle[] {
  const count = 60;
  const cx = w / 2;
  const cy = h / 2;
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = Math.random() * 3 + 1.5;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 6,
      width: Math.random() * 6 + 3,
      height: Math.random() * 6 + 3,
      color: randomColor(),
      opacity: 1,
      life: 0,
      maxLife: 60 + Math.random() * 40,
      shape: "star",
    });
  }
  return particles;
}

function createFireworkParticles(w: number, h: number): Particle[] {
  const count = 90;
  const cx = w / 2;
  const cy = h * 0.4;
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      rotation: 0,
      rotationSpeed: 0,
      width: Math.random() * 4 + 2,
      height: Math.random() * 4 + 2,
      color: randomColor(),
      opacity: 1,
      life: 0,
      maxLife: 50 + Math.random() * 40,
      shape: "circle",
    });
  }
  return particles;
}

const PARTICLE_FACTORIES: Record<CelebrationVariant, (w: number, h: number) => Particle[]> = {
  confetti: createConfettiParticles,
  sparkle: createSparkleParticles,
  firework: createFireworkParticles,
};

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const spikes = 4;
  const outerRadius = r;
  const innerRadius = r * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function renderParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = p.color;

  if (p.shape === "rect") {
    ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
  } else if (p.shape === "star") {
    drawStar(ctx, 0, 0, p.width);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function updateParticle(p: Particle, variant: CelebrationVariant): boolean {
  p.life++;
  if (p.life >= p.maxLife) return false;

  p.x += p.vx;
  p.y += p.vy;
  p.rotation += p.rotationSpeed;

  if (variant === "confetti") {
    // Gravity + air resistance
    p.vy += 0.06;
    p.vx *= 0.995;
    // Wobble
    p.vx += Math.sin(p.life * 0.1) * 0.08;
  } else if (variant === "sparkle") {
    // Slow down over time
    p.vx *= 0.97;
    p.vy *= 0.97;
  } else {
    // Firework: gravity pulling down, fade
    p.vy += 0.05;
    p.vx *= 0.98;
  }

  // Fade out in last 30% of life
  const fadeStart = p.maxLife * 0.7;
  if (p.life > fadeStart) {
    p.opacity = Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart));
  }

  return true;
}

/* ── Canvas component ── */

function ParticleCanvas({ variant, playing }: { variant: CelebrationVariant; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to window
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Initialize particles
    particlesRef.current = PARTICLE_FACTORIES[variant](w, h);

    function animate() {
      if (!ctx || !canvas) return;
      const cw = canvas.width / (window.devicePixelRatio || 1);
      const ch = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, cw, ch);

      particlesRef.current = particlesRef.current.filter((p) => updateParticle(p, variant));

      for (const p of particlesRef.current) {
        renderParticle(ctx, p);
      }

      if (particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      particlesRef.current = [];
    };
  }, [variant, playing]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}

/* ── CelebrationOverlay component ── */

export function CelebrationOverlay({
  show,
  onClose,
  title,
  subtitle,
  reward,
  variant = "confetti",
  autoDismissMs = 3000,
  children,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);

  // Sync internal visibility with `show` prop
  useEffect(() => {
    if (show) {
      setVisible(true);
      haptic("success");
      try {
        playSound("levelUp");
      } catch {
        /* blocked */
      }
    }
  }, [show]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!show || autoDismissMs <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [show, autoDismissMs]);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const handleExitComplete = useCallback(() => {
    if (!visible) {
      onClose();
    }
  }, [visible, onClose]);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && show && (
        <FocusTrap active onEscape={handleClose}>
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            role="status"
            aria-live="assertive"
            aria-label={title}
          >
            {/* Particle canvas */}
            <ParticleCanvas variant={variant} playing={visible} />

            {/* Content card */}
            <motion.div
              className="relative z-10 flex flex-col items-center text-center max-w-sm"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title */}
              <motion.h2
                className="text-2xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {title}
              </motion.h2>

              {/* Subtitle */}
              {subtitle && (
                <motion.p
                  className="text-sm text-white/60 mb-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {subtitle}
                </motion.p>
              )}

              {/* Reward badge */}
              {reward && (
                <motion.div
                  className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 mb-6"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 20 }}
                >
                  <span className="text-3xl">{reward.icon}</span>
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-wider text-amber-300/80">
                      {reward.type}
                    </p>
                    <p className="text-lg font-bold text-white">
                      +{reward.amount}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Optional children slot */}
              {children}

              {/* Dismiss button */}
              <motion.button
                type="button"
                onClick={handleClose}
                whileTap={{ scale: 0.95 }}
                className="mt-4 rounded-full border border-white/20 bg-white/10 px-8 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/20 active:scale-95"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                확인
              </motion.button>
            </motion.div>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}

/* ── useCelebration hook ── */

export interface CelebrateOptions {
  title: string;
  subtitle?: string;
  reward?: CelebrationReward;
  variant?: CelebrationVariant;
  autoDismissMs?: number;
}

export function useCelebration() {
  const [state, setState] = useState<CelebrateOptions | null>(null);
  const [show, setShow] = useState(false);

  const celebrate = useCallback((opts: CelebrateOptions) => {
    setState(opts);
    setShow(true);
  }, []);

  const handleClose = useCallback(() => {
    setShow(false);
    setState(null);
  }, []);

  const CelebrationElement = (
    <CelebrationOverlay
      show={show}
      onClose={handleClose}
      title={state?.title ?? ""}
      subtitle={state?.subtitle}
      reward={state?.reward}
      variant={state?.variant}
      autoDismissMs={state?.autoDismissMs}
    />
  );

  return { celebrate, CelebrationOverlay: CelebrationElement };
}
