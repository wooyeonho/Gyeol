import { useState } from "react";

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

export function useDevicePerformance() {
  const [isLowDevice] = useState(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as NavigatorWithDeviceMemory).deviceMemory || 4;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    return prefersReducedMotion || memory <= 2 || (isMobile && cores <= 4);
  });

  return isLowDevice;
}
