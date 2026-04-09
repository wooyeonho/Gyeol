"use client";

import { useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { FocusTrap } from "@/components/focus-trap";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Title for accessibility */
  title?: string;
  /** Max height as CSS value */
  maxHeight?: string;
}

/**
 * Toss-style bottom sheet with drag-to-dismiss.
 * Replaces full modals for settings/options — half-sheet pattern.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  title = "Options",
  maxHeight = "70vh",
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <FocusTrap active={open} onEscape={onClose}>
            <motion.div
              ref={sheetRef}
              className="fixed bottom-0 left-0 right-0 z-[81] rounded-t-3xl border-t border-white/10 bg-[#0a0a0f] shadow-2xl"
              style={{ maxHeight }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="y"
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              aria-label={title}
            >
              {/* Drag handle */}
              <div
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* Content */}
              <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: `calc(${maxHeight} - 48px)` }}>
                {children}
              </div>
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  );
}
