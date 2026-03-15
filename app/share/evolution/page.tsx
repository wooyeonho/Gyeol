"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations } from "@/components/i18n-provider";

function EvolutionShareCard() {
  const { locale, t } = useTranslations();
  const searchParams = useSearchParams();

  const gen = searchParams.get("gen");
  const mutation = searchParams.get("mutation");
  const name = searchParams.get("name");

  if (!gen) {
    return (
      <div className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.08)]">
          <div className="mb-4 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/55">
            {t("evolution.cardEyebrow")}
          </div>
          <p className="text-base text-white/72">{t("sharePage.notFound")}</p>
          <Link
            href="/"
            className="mt-5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15"
          >
            {t("sharePage.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  const level = parseInt(gen, 10);
  const displayName = name || "GYEOL";
  const primaryColor = "#a78bfa";
  const secondaryColor = "#38bdf8";

  return (
    <div className="min-h-screen bg-black px-6 py-12 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.18),transparent_60%)]"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-sm">
        {/* Identity Card */}
        <article
          className="relative overflow-hidden rounded-3xl border p-6"
          style={{
            borderColor: `${primaryColor}40`,
            background: `linear-gradient(160deg, ${primaryColor}18 0%, #000000 40%, ${secondaryColor}12 100%)`,
            boxShadow: `0 0 60px ${primaryColor}20, 0 0 120px ${secondaryColor}10`,
          }}
        >
          {/* Card inner glow */}
          <div
            className="absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl opacity-30"
            style={{ background: primaryColor }}
          />
          <div
            className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full blur-3xl opacity-20"
            style={{ background: secondaryColor }}
          />

          <div className="relative">
            <span
              className="text-[10px] uppercase tracking-[0.3em] font-medium"
              style={{ color: `${primaryColor}cc` }}
            >
              {t("evolution.complete")}
            </span>

            {/* Gen Level */}
            <div className="mt-4">
              <span className="text-5xl font-bold tracking-tight text-white">
                Gen {isNaN(level) ? gen : level}
              </span>
            </div>

            {/* AI Name */}
            <div className="mt-3 flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: primaryColor,
                  boxShadow: `0 0 8px ${primaryColor}80`,
                }}
              />
              <span className="text-lg font-semibold text-white/90 tracking-wide">
                {displayName}
              </span>
            </div>

            {/* Mutation badge */}
            {mutation && (
              <div className="mt-4">
                <span
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    borderColor: `${secondaryColor}30`,
                    background: `${secondaryColor}14`,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {mutation}
                </span>
              </div>
            )}

            {/* Divider */}
            <div
              className="mt-5 h-px w-full"
              style={{
                background: `linear-gradient(to right, transparent, ${primaryColor}40, transparent)`,
              }}
            />

            {/* Watermark */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                GYEOL
              </span>
              <span className="text-[10px] text-white/30">
                {new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </article>

        {/* CTA */}
        <div className="mt-6">
          <Link
            href="/"
            className="block w-full rounded-xl py-3 text-center text-sm font-medium transition-colors"
            style={{ background: `${primaryColor}20`, color: primaryColor }}
          >
            {t("sharePage.growWithGyeol")}
          </Link>
        </div>

        <p className="mt-4 text-center text-white/40 text-xs">
          {t("sharePage.tagline")}
        </p>
      </div>
    </div>
  );
}

export default function EvolutionSharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      }
    >
      <EvolutionShareCard />
    </Suspense>
  );
}
