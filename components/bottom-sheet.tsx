"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { FocusTrap } from "@/components/focus-trap";

interface BottomSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /** Optional title displayed at top and used for aria-label */
  title?: string;
  /** Sheet content */
  children: ReactNode;
  /** Snap points as fractions of viewport height (default [0.5, 0.9]) */
  snapPoints?: number[];
}

/**
 * Toss / Apple-style bottom sheet with drag-to-dismiss and snap points.
 * Dark glassmorphism card with spring animations.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  /* ── Body scroll lock ── */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /* ── Escape key handled by FocusTrap ── */

  /* ── Snap to nearest snap point or dismiss ── */
  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      // If dragged down enough or with enough velocity, dismiss
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
        return;
      }

      // Snap to nearest point
      if (sheetRef.current && snapPoints.length > 1) {
        const vh = window.innerHeight;
        const currentTranslateY = info.offset.y;
        const currentHeight = sheetRef.current.getBoundingClientRect().height;
        const currentFraction = (currentHeight - currentTranslateY) / vh;

        let closest = snapPoints[0];
        let minDist = Math.abs(currentFraction - closest);
        for (const sp of snapPoints) {
          const dist = Math.abs(currentFraction - sp);
          if (dist < minDist) {
            minDist = dist;
            closest = sp;
          }
        }

        // Update the sheet height to the closest snap
        sheetRef.current.style.height = `${closest * 100}vh`;
      }
    },
    [onClose, snapPoints],
  );

  // Initial height from first snap point
  const initialHeight = `${snapPoints[0] * 100}vh`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <FocusTrap active={isOpen} onEscape={onClose}>
            <motion.div
              ref={sheetRef}
              className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col bg-zinc-900/90 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl"
              style={{ height: initialHeight }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="y"
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              role="dialog"
              aria-modal="true"
              aria-label={title ?? "Bottom sheet"}
            >
              {/* Drag handle */}
              <div
                className="flex shrink-0 justify-center py-3 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* Title */}
              {title && (
                <div className="shrink-0 px-5 pb-3">
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                </div>
              )}

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
                {children}
              </div>
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  );
}
