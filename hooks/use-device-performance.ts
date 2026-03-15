import { useEffect, useState } from "react";

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
    addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
    removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  };
};

export function evaluateLowDeviceProfile(params: {
  userAgent: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  prefersReducedMotion: boolean;
  saveData: boolean;
  effectiveType?: string;
}) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(params.userAgent);
  const slowNetwork = params.effectiveType ? /2g|3g/i.test(params.effectiveType) : false;

  return params.prefersReducedMotion
    || params.saveData
    || slowNetwork
    || params.deviceMemory <= 2
    || (isMobile && params.hardwareConcurrency <= 4);
}

export function useDevicePerformance() {
  const [isLowDevice, setIsLowDevice] = useState(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }

    const connection = (navigator as NavigatorWithDeviceMemory).connection;
    return evaluateLowDeviceProfile({
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: (navigator as NavigatorWithDeviceMemory).deviceMemory || 4,
      prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      saveData: connection?.saveData === true,
      effectiveType: connection?.effectiveType,
    });
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as NavigatorWithDeviceMemory).connection;

    const recompute = () => {
      setIsLowDevice(
        evaluateLowDeviceProfile({
          userAgent: navigator.userAgent,
          hardwareConcurrency: navigator.hardwareConcurrency || 4,
          deviceMemory: (navigator as NavigatorWithDeviceMemory).deviceMemory || 4,
          prefersReducedMotion: mediaQuery.matches,
          saveData: connection?.saveData === true,
          effectiveType: connection?.effectiveType,
        }),
      );
    };

    recompute();
    mediaQuery.addEventListener?.("change", recompute);
    connection?.addEventListener?.("change", recompute);

    return () => {
      mediaQuery.removeEventListener?.("change", recompute);
      connection?.removeEventListener?.("change", recompute);
    };
  }, []);

  return isLowDevice;
}
