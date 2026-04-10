"use client";

import { motion } from "framer-motion";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  /** Intensity 0-1 of aurora effect */
  intensity?: number;
}

/**
 * Aurora gradient background — Discord/Notion 2026 style.
 * Slow-moving multicolor gradient overlaid on dark base.
 */
export function AuroraBackground({ children, className = "", intensity = 0.6 }: AuroraBackgroundProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Dark base */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />

      {/* Aurora layer 1 — violet */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: intensity * 0.7 }}
        animate={{
          background: [
            "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(129,140,248,0.25) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 60% 20%, rgba(167,139,250,0.2) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 80% 50%, rgba(129,140,248,0.25) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 20% 70%, rgba(129,140,248,0.2) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(129,140,248,0.25) 0%, transparent 70%)",
          ],
        }}
        transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
      />

      {/* Aurora layer 2 — cyan */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: intensity * 0.5 }}
        animate={{
          background: [
            "radial-gradient(ellipse 60% 80% at 70% 70%, rgba(96,165,250,0.2) 0%, transparent 65%)",
            "radial-gradient(ellipse 60% 80% at 30% 80%, rgba(74,222,128,0.15) 0%, transparent 65%)",
            "radial-gradient(ellipse 60% 80% at 10% 40%, rgba(96,165,250,0.18) 0%, transparent 65%)",
            "radial-gradient(ellipse 60% 80% at 50% 10%, rgba(96,165,250,0.2) 0%, transparent 65%)",
            "radial-gradient(ellipse 60% 80% at 70% 70%, rgba(96,165,250,0.2) 0%, transparent 65%)",
          ],
        }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut", delay: 3 }}
      />

      {/* Aurora layer 3 — rose accent */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: intensity * 0.3 }}
        animate={{
          background: [
            "radial-gradient(ellipse 40% 40% at 85% 15%, rgba(244,63,94,0.12) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 40% at 15% 85%, rgba(251,191,36,0.1) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 40% at 85% 85%, rgba(244,63,94,0.12) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 40% at 85% 15%, rgba(244,63,94,0.12) 0%, transparent 60%)",
          ],
        }}
        transition={{ repeat: Infinity, duration: 22, ease: "easeInOut", delay: 7 }}
      />

      {/* Fine noise texture for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
