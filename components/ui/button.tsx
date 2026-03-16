"use client";

import React from "react";
import { motion } from "framer-motion";
import { haptic } from "@/lib/micro-interactions";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", onClick, children, disabled, type = "button", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-black";

    const variants = {
      primary: "bg-white text-black hover:bg-neutral-200 focus-visible:ring-white",
      secondary: "bg-neutral-800 text-white hover:bg-neutral-700 focus-visible:ring-neutral-400",
      outline:
        "border border-neutral-700 bg-transparent text-white hover:bg-neutral-800 focus-visible:ring-neutral-500",
      ghost: "bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:ring-neutral-500",
      danger: "bg-red-900 text-red-100 hover:bg-red-800 focus-visible:ring-red-500",
    };

    const sizes = {
      sm: "h-9 min-w-[36px] px-3 text-sm",
      md: "h-11 min-w-[44px] px-4 py-2 text-sm",
      lg: "h-12 min-w-[48px] px-8 text-base",
      icon: "h-11 w-11",
    };

    return (
      <motion.div
        whileTap={disabled ? undefined : { scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="inline-flex"
      >
        <button
          ref={ref}
          type={type}
          disabled={disabled}
          className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
          onClick={(e) => {
            haptic("tap");
            onClick?.(e);
          }}
          {...props}
        >
          {children}
        </button>
      </motion.div>
    );
  },
);

Button.displayName = "Button";
