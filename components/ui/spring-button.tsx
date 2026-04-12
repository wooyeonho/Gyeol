"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { spring } from "@/lib/design/tokens";
import { haptic } from "@/lib/micro-interactions";

interface SpringButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  hapticPattern?: "tap" | "success" | "toggle";
}

const variants = {
  primary:
    "bg-indigo-500 text-white hover:bg-indigo-400 border-indigo-400/30",
  secondary:
    "bg-white/[0.06] text-white/80 hover:bg-white/[0.12] border-white/10",
  ghost:
    "bg-transparent text-white/60 hover:text-white/90 hover:bg-white/[0.06] border-transparent",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-2xl",
};

export function SpringButton({
  children,
  variant = "primary",
  size = "md",
  hapticPattern = "tap",
  className = "",
  onClick,
  ...props
}: SpringButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={spring.pop}
      className={`border font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={(e) => {
        haptic(hapticPattern);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
