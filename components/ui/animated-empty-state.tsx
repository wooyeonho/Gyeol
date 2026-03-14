"use client";

import { motion } from "framer-motion";
import { Ghost, Inbox, AlertCircle, MessageCircle, Users, Image, Compass, Zap } from "lucide-react";

export interface AnimatedEmptyStateProps {
  icon?: "ghost" | "inbox" | "alert" | "chat" | "social" | "album" | "explore" | "activity";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
  className?: string;
}

const iconMap = {
  ghost: Ghost,
  inbox: Inbox,
  alert: AlertCircle,
  chat: MessageCircle,
  social: Users,
  album: Image,
  explore: Compass,
  activity: Zap,
};

export function AnimatedEmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  onAction,
  accentColor = "#22d3ee",
  className = "",
}: AnimatedEmptyStateProps) {
  const IconComponent = iconMap[icon];

  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-white/10 bg-white/[0.02] ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Animated icon with glow */}
      <motion.div
        className="relative flex h-20 w-20 items-center justify-center rounded-full mb-5"
        style={{
          background: `${accentColor}10`,
          boxShadow: `0 0 40px ${accentColor}15, 0 0 80px ${accentColor}08`,
        }}
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: [
            `0 0 40px ${accentColor}15, 0 0 80px ${accentColor}08`,
            `0 0 60px ${accentColor}25, 0 0 100px ${accentColor}12`,
            `0 0 40px ${accentColor}15, 0 0 80px ${accentColor}08`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <IconComponent
            className="h-9 w-9"
            style={{ color: `${accentColor}90` }}
          />
        </motion.div>
      </motion.div>

      {/* Title with staggered entrance */}
      <motion.h3
        className="text-lg font-medium text-white mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        className="text-sm text-white/50 max-w-xs mb-6 leading-relaxed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        {description}
      </motion.p>

      {/* CTA button with hover animation */}
      {actionLabel && onAction && (
        <motion.button
          type="button"
          onClick={onAction}
          className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all"
          style={{
            background: `${accentColor}20`,
            border: `1px solid ${accentColor}35`,
          }}
          whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${accentColor}30` }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
