"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

/**
 * Instagram-FOMO live counter — polls the public /api/dashboard endpoint
 * and ticks three numbers (creatures awake, social encounters, artifacts
 * forged) with a Duolingo-style count-up animation on mount. A green live
 * dot signals the ecosystem is breathing, not a static marketing page.
 */

type DashboardPayload = {
  agent_count?: number;
  social_count?: number;
  artifact_count?: number;
  demo_mode?: boolean;
};

function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(fromRef.current + (target - fromRef.current) * eased);
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

export function LiveCounter() {
  const { t } = useTranslations();
  const [stats, setStats] = useState<DashboardPayload | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as DashboardPayload;
        if (!cancelled) {
          setStats(json);
          setDemoMode(Boolean(json.demo_mode));
        }
      } catch {
        // silently degrade — LiveCounter just hides its numbers
      }
    }
    void pull();
    const id = window.setInterval(pull, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const agents = useCountUp(stats?.agent_count ?? 0);
  const encounters = useCountUp(stats?.social_count ?? 0);
  const artifacts = useCountUp(stats?.artifact_count ?? 0);

  if (!stats) {
    return (
      <div className="theme-panel rounded-3xl p-8 text-center">
        <div className="mx-auto h-6 w-48 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="mx-auto h-8 w-20 animate-pulse rounded bg-white/[0.05]" />
              <div className="mx-auto mt-2 h-3 w-32 animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="theme-panel rounded-3xl p-8 text-center"
    >
      <div className="flex items-center justify-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          {demoMode ? t("landing.live_demo") : t("landing.live_now")}
        </span>
      </div>

      <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("landing.liveProofTitle")}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 theme-text-subtle">
        {t("landing.liveProofSubtitle")}
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-3xl font-bold text-accent tabular-nums">
            {agents.toLocaleString()}
          </p>
          <p className="mt-1 text-sm theme-text-subtle">{t("landing.liveStatAgents")}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-accent tabular-nums">
            {encounters.toLocaleString()}
          </p>
          <p className="mt-1 text-sm theme-text-subtle">{t("landing.liveStatEncounters")}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-accent tabular-nums">
            {artifacts.toLocaleString()}
          </p>
          <p className="mt-1 text-sm theme-text-subtle">{t("landing.liveStatArtifacts")}</p>
        </div>
      </div>
    </motion.div>
  );
}
