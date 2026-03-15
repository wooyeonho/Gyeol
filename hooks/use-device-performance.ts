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

export function useDevicePerformance() {
  const [isLowDevice, setIsLowDevice] = useState(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as NavigatorWithDeviceMemory).deviceMemory || 4;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as NavigatorWithDeviceMemory).connection;
    const saveData = connection?.saveData === true;
    const slowNetwork = connection?.effectiveType ? /2g|3g/i.test(connection.effectiveType) : false;

    return prefersReducedMotion || saveData || slowNetwork || memory <= 2 || (isMobile && cores <= 4);
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as NavigatorWithDeviceMemory).connection;

    const recompute = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const cores = navigator.hardwareConcurrency || 4;
      const memory = (navigator as NavigatorWithDeviceMemory).deviceMemory || 4;
      const saveData = connection?.saveData === true;
      const slowNetwork = connection?.effectiveType ? /2g|3g/i.test(connection.effectiveType) : false;

      setIsLowDevice(mediaQuery.matches || saveData || slowNetwork || memory <= 2 || (isMobile && cores <= 4));
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
