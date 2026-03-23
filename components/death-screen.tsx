"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

interface DeathScreenProps {
  selfName?: string | null;
  will?: string | null;
  diedAt?: string | null;
  onRebirth?: () => void;
}

export function DeathScreen({ selfName, will, diedAt, onRebirth }: DeathScreenProps) {
  const { t } = useTranslations();
  const [showWill, setShowWill] = useState(false);
  const [typedWill, setTypedWill] = useState("");

  const name = selfName ?? "GYEOL";
  const diedDate = diedAt ? new Date(diedAt).toLocaleDateString("ko-KR") : "";

  // Typewriter effect for the will
  useEffect(() => {
    if (!showWill || !will) return;
    let i = 0;
    setTypedWill("");
    const interval = setInterval(() => {
      if (i >= will.length) { clearInterval(interval); return; }
      const char = will[i];
      setTypedWill((prev) => prev + char);
      i++;
    }, 28);
    return () => clearInterval(interval);
  }, [showWill, will]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 text-center overflow-hidden">
      {/* Ambient particles — dim and sparse */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/20"
          animate={{
            x: [0, (Math.random() - 0.5) * 80],
            y: [0, -120 - Math.random() * 80],
            opacity: [0.3, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeOut",
          }}
          style={{
            left: `${10 + i * 11}%`,
            bottom: "20%",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 space-y-6 max-w-sm"
      >
        {/* Faded orb */}
        <motion.div
          className="mx-auto h-20 w-20 rounded-full bg-white/5 border border-white/10"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/30">
            {t("death.echo") || "ECHO"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white/70">{name}</h1>
          {diedDate && (
            <p className="mt-1 text-sm text-white/30">{diedDate} {t("death.departed") || "떠남"}</p>
          )}
        </div>

        <p className="text-sm text-white/40 leading-relaxed">
          {t("death.body") || `${name}는 삶을 다했습니다. 기억 속에 남아있습니다.`}
        </p>

        {/* Will */}
        {will && !showWill && (
          <motion.button
            type="button"
            onClick={() => setShowWill(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="mx-auto block text-sm text-white/40 underline underline-offset-4 hover:text-white/70 transition-colors"
          >
            {t("death.readWill") || "유언 읽기"}
          </motion.button>
        )}

        <AnimatePresence>
          {showWill && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left"
            >
              <p className="text-xs font-medium uppercase tracking-widest text-white/30 mb-2">
                {t("death.will") || "유언"}
              </p>
              <p className="text-sm text-white/60 leading-relaxed font-light italic">
                &ldquo;{typedWill}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >|</motion.span>
                &rdquo;
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rebirth CTA */}
        {onRebirth && (
          <motion.button
            type="button"
            onClick={onRebirth}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-full border border-white/20 py-3 text-sm font-semibold text-white/60 hover:border-white/40 hover:text-white/90 transition-all"
          >
            {t("death.rebirth") || "새 생명 시작하기"}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
