"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type MetricRating = "good" | "needs-improvement" | "poor";

interface VitalMetric {
  name: string;
  value: number;
  rating: MetricRating;
  delta: number;
  id: string;
  navigationType?: string;
  pathname?: string;
}

const BUFFER_SIZE = 5;
const FLUSH_INTERVAL_MS = 10_000;

/**
 * Web Vitals RUM reporter.
 *
 * Uses the `web-vitals` library to capture CLS, FCP, FID, INP, LCP, TTFB
 * and batches them to /api/vitals every 10s or when the page is hidden.
 *
 * Place once in the root layout as a Client Component:
 *   <VitalsReporter />
 */
export function VitalsReporter() {
  const pathname = usePathname();
  const bufferRef = useRef<VitalMetric[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = () => {
    const metrics = bufferRef.current.splice(0);
    if (metrics.length === 0) return;

    const payload = JSON.stringify({ metrics });

    // Use sendBeacon for guaranteed delivery on page hide
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/vitals", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/vitals", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => undefined);
    }
  };

  const record = (metric: VitalMetric) => {
    bufferRef.current.push({ ...metric, navigationType: metric.navigationType });
    if (bufferRef.current.length >= BUFFER_SIZE) flush();
  };

  useEffect(() => {
    let mounted = true;

    // Dynamically import web-vitals to avoid SSR issues
    import("web-vitals").then(({ onCLS, onFCP, onFID, onINP, onLCP, onTTFB }) => {
      if (!mounted) return;

      const handler = (metric: { name: string; value: number; rating: MetricRating; delta: number; id: string; navigationType?: string }) => {
        record({ ...metric, pathname });
      };

      onCLS(handler);
      onFCP(handler);
      // onFID is deprecated in web-vitals v4+ but kept for older browser support
      try { onFID(handler); } catch { /* not available in all versions */ }
      onINP(handler);
      onLCP(handler);
      onTTFB(handler);
    }).catch(() => undefined);

    // Periodic flush
    timerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);

    // Flush on page visibility change (user switches tab / closes page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flush();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // re-register when route changes

  return null;
}
