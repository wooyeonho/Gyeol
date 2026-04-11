"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useTranslations } from "@/components/i18n-provider";
import { useCelebrationStore } from "@/store/celebration-store";

interface ShopCopy {
  title: string;
  subtitle: string;
  owned: string;
  cap: string;
  price: string;
  buy: string;
  buying: string;
  full: string;
  notEnough: string;
  success: string;
  error: string;
}

const COPY: Record<string, ShopCopy> = {
  ko: {
    title: "🛡️ 스트릭 쉴드 상점",
    subtitle: "하루를 놓쳐도 불꽃이 꺼지지 않게 지켜줘요.",
    owned: "보유",
    cap: "최대",
    price: "가격",
    buy: "구매",
    buying: "구매 중...",
    full: "가득 찼어요",
    notEnough: "코인이 부족해요",
    success: "쉴드를 획득했어요!",
    error: "구매에 실패했어요",
  },
  en: {
    title: "🛡️ Streak Shield Shop",
    subtitle: "Protect your flame from a missed day.",
    owned: "Owned",
    cap: "Max",
    price: "Price",
    buy: "Buy",
    buying: "Buying...",
    full: "Shields full",
    notEnough: "Not enough coins",
    success: "Shield acquired!",
    error: "Purchase failed",
  },
  ja: {
    title: "🛡️ ストリークシールドの店",
    subtitle: "1日を逃しても炎が消えないよう守ります。",
    owned: "所持",
    cap: "最大",
    price: "価格",
    buy: "購入",
    buying: "購入中...",
    full: "所持数が上限です",
    notEnough: "コインが足りません",
    success: "シールドを獲得!",
    error: "購入に失敗しました",
  },
  zh: {
    title: "🛡️ 连胜护盾商店",
    subtitle: "让你错过一天也不会熄灭火焰。",
    owned: "持有",
    cap: "上限",
    price: "价格",
    buy: "购买",
    buying: "购买中...",
    full: "已满",
    notEnough: "金币不足",
    success: "护盾获得!",
    error: "购买失败",
  },
  es: {
    title: "🛡️ Tienda de Escudo",
    subtitle: "Protege tu llama de un día perdido.",
    owned: "Tienes",
    cap: "Máx",
    price: "Precio",
    buy: "Comprar",
    buying: "Comprando...",
    full: "Escudos llenos",
    notEnough: "Monedas insuficientes",
    success: "¡Escudo adquirido!",
    error: "Compra fallida",
  },
};

const SHIELD_PRICE = 50;
const SHIELD_MAX = 3;

export function StreakShieldShop() {
  const { locale } = useTranslations();
  const loc = (["ko", "en", "ja", "zh", "es"].includes(locale) ? locale : "en") as keyof typeof COPY;
  const copy = COPY[loc];
  const celebrate = useCelebrationStore((s) => s.celebrate);

  const [shields, setShields] = useState<number | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/agent/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const state = data?.agentState ?? null;
      const cfg = (state?.config ?? {}) as Record<string, unknown>;
      setShields(typeof cfg.streak_shields === "number" ? (cfg.streak_shields as number) : 0);
      setCoins(typeof state?.coins === "number" ? state.coins : 0);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleBuy() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/streak/shield/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error === "Insufficient coins" ? copy.notEnough : copy.error);
        return;
      }
      setShields(data.shields);
      if (typeof coins === "number") setCoins(coins - SHIELD_PRICE);
      celebrate({
        title: `🛡️ ${copy.success}`,
        subtitle: `${copy.owned} ×${data.shields}`,
        variant: "sparkle",
        autoDismissMs: 2500,
      });
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  const full = shields !== null && shields >= SHIELD_MAX;
  const cantAfford = coins !== null && coins < SHIELD_PRICE;
  const disabled = busy || full || cantAfford || shields === null;

  return (
    <section className="rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-purple-500/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-blue-300/80">{copy.title}</p>
      <p className="mt-1 text-sm text-white/60">{copy.subtitle}</p>

      {/* Shield row */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Big shield icon */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
              <path
                d="M12 2L4 6v6c0 5.25 3.5 10 8 12 4.5-2 8-6.75 8-12V6L12 2z"
                fill="#3b82f6"
                stroke="#93c5fd"
                strokeWidth="1"
              />
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          <div className="space-y-0.5 text-xs">
            <p className="text-white/60">
              {copy.owned}:{" "}
              <span className="font-bold text-blue-300 tabular-nums">
                {shields === null ? "—" : `${shields} / ${SHIELD_MAX}`}
              </span>
            </p>
            <p className="text-white/60">
              {copy.price}: <span className="font-bold text-amber-300 tabular-nums">🪙 {SHIELD_PRICE}</span>
            </p>
            {coins !== null && (
              <p className="text-white/40">
                🪙 <span className="tabular-nums">{coins}</span>
              </p>
            )}
          </div>
        </div>

        {/* Buy button */}
        <motion.button
          type="button"
          onClick={() => void handleBuy()}
          disabled={disabled}
          whileTap={!disabled ? { scale: 0.94 } : undefined}
          className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-semibold transition-all ${
            full
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : cantAfford
              ? "bg-red-500/10 text-red-300/60 cursor-not-allowed border border-red-400/20"
              : busy
              ? "bg-blue-500/30 text-white/70 cursor-wait"
              : "bg-blue-500/25 text-blue-100 border border-blue-400/40 hover:bg-blue-500/35 shadow-lg shadow-blue-500/20"
          }`}
        >
          {full
            ? copy.full
            : cantAfford
            ? copy.notEnough
            : busy
            ? copy.buying
            : copy.buy}
        </motion.button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-xs text-red-300"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
