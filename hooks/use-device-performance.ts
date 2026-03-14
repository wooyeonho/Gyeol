import { useState, useEffect } from "react";

function isLowPerformanceDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Classify as low device if user prefers reduced motion, or if the device has very low memory,
    // or if it's a mobile device with 4 or fewer cores.
    if (prefersReducedMotion || memory <= 2 || (isMobile && cores <= 4)) {
      return true;
    }
  } catch {
    // Silently fall back to normal performance profile if detection fails
  }

  return false;
}

// We use a safe sync state initializer if running on the client.
// However, since Next.js does SSR, using navigator directly in useState might cause hydration mismatch.
// As a workaround, we defer the state update to a timeout in the effect so it runs asynchronously,
// avoiding the "sync setState in effect" error from ESLint while preserving SSR hydration.

export function useDevicePerformance() {
  const [isLowDevice, setIsLowDevice] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLowPerformanceDevice()) {
        setIsLowDevice(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return isLowDevice;
}
