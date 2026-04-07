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

type DevicePerformanceResult = {
  isLowDevice: boolean;
  isMobile: boolean;
  reducedVisualMode: boolean;
};

function computeProfile(): DevicePerformanceResult {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isLowDevice: false, isMobile: false, reducedVisualMode: false };
  }
  const nav = navigator as NavigatorWithDeviceMemory;
  const connection = nav.connection;
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = connection?.saveData === true;
  const slowNetwork = /2g|3g/i.test(connection?.effectiveType ?? "");
  const lowConcurrency = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  // WebGL availability check — fallback to CSS creature on devices without GPU support
  let noWebGL = false;
  try {
    const canvas = document.createElement("canvas");
    noWebGL = !canvas.getContext("webgl2") && !canvas.getContext("webgl");
  } catch { noWebGL = true; }
  const reducedVisualMode = prefersReducedMotion || lowConcurrency || lowMemory || saveData || slowNetwork || noWebGL;
  const isLowDevice = evaluateLowDeviceProfile({
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemory: nav.deviceMemory || 4,
    prefersReducedMotion,
    saveData,
    effectiveType: connection?.effectiveType,
  });
  return { isLowDevice, isMobile, reducedVisualMode };
}

export function useDevicePerformance(): DevicePerformanceResult {
  const [profile, setProfile] = useState<DevicePerformanceResult>(() => computeProfile());

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as NavigatorWithDeviceMemory).connection;
    const recompute = () => setProfile(computeProfile());

    recompute();
    mediaQuery.addEventListener?.("change", recompute);
    connection?.addEventListener?.("change", recompute);

    return () => {
      mediaQuery.removeEventListener?.("change", recompute);
      connection?.removeEventListener?.("change", recompute);
    };
  }, []);

  return profile;
}
