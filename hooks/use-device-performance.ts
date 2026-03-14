import { useState, useEffect } from "react";

export function useDevicePerformance() {
  const [isLowDevice, setIsLowDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const cores = navigator.hardwareConcurrency || 4;
      const memory = (navigator as any).deviceMemory || 4; 
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Classify as low device if user prefers reduced motion, or if the device has very low memory,
      // or if it's a mobile device with 4 or fewer cores.
      if (prefersReducedMotion || memory <= 2 || (isMobile && cores <= 4)) {
        setIsLowDevice(true);
      }
    } catch (e) {
      // Silently fall back to normal performance profile if detection fails
    }
  }, []);

  return isLowDevice;
}
