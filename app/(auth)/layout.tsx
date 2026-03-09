"use client";

import { motion } from "framer-motion";

export const dynamic = "force-dynamic";

function FloatingOrb({
  x,
  y,
  size,
  color,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: color,
        filter: `blur(${size * 0.6}px)`,
        opacity: 0,
      }}
      animate={{
        opacity: [0, 0.5, 0.3, 0.5, 0],
        scale: [0.8, 1.1, 0.95, 1.05, 0.8],
        x: [0, 20, -10, 15, 0],
        y: [0, -15, 10, -8, 0],
      }}
      transition={{
        duration: 12,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <FloatingOrb x="10%" y="20%" size={300} color="rgba(124,58,237,0.35)" delay={0} />
      <FloatingOrb x="65%" y="10%" size={250} color="rgba(79,70,229,0.3)" delay={2} />
      <FloatingOrb x="5%" y="65%" size={200} color="rgba(139,92,246,0.25)" delay={4} />
      <FloatingOrb x="70%" y="60%" size={280} color="rgba(99,102,241,0.28)" delay={1.5} />
      <FloatingOrb x="40%" y="80%" size={180} color="rgba(167,139,250,0.2)" delay={3} />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
