"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { spring } from "@/lib/design/tokens";

interface SpringCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  hoverScale?: number;
  tapScale?: number;
  className?: string;
}

export function SpringCard({
  children,
  hoverScale = 1.015,
  tapScale = 0.985,
  className = "",
  ...props
}: SpringCardProps) {
  return (
    <motion.div
      whileHover={{ scale: hoverScale, y: -2 }}
      whileTap={{ scale: tapScale }}
      transition={spring.apple}
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
