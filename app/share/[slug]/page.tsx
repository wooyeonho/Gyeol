"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

type ShareCardData = {
  self_name: string;
  visual: { color?: string; shape?: string } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
  total_messages: number;
  vitality: number;
  gen_level: number;
  milestones: Array<{ type: string; label: string; at: string; summary?: string }>;
  week_messages: number;
};

export default function SharePage() {
  const { locale, t } = useTranslations();
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [data, setData] = useState<ShareCardData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not_found" | "error">(
    slug ? "loading" : "not_found"
  );

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/share/${slug}`)
      .then(async (r) => {
        if (r.ok) return r.json();
        if (r.status === 404) {
          if (!cancelled) setStatus("not_found");
          return null;
        }
        throw new Error("share_fetch_failed");
      })
      .then((d) => {
        if (d) {
          if (!cancelled) {
            setData(d);
            setStatus("ready");
          }
        } else if (!cancelled) {
          setStatus("not_found");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!slug) {
    return (
      <div className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.08)]">
          <div className="mb-4 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/55">
            {locale === "en" ? "shared growth card" : "shared growth card"}
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

  if (status === "not_found" || status === "error") {
    return (
      <div className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.08)]">
          <div className="mb-4 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/55">
            {locale === "en" ? "shared growth card" : "shared growth card"}
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

  if (status === "loading" || !data) {
    return (
      <div className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-md">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_80px_rgba(34,211,238,0.08)]">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
            </div>
            <div className="mt-6 space-y-2">
              <div className="h-12 animate-pulse rounded-xl bg-white/5" />
              <div className="h-12 animate-pulse rounded-xl bg-white/5" />
              <div className="h-12 animate-pulse rounded-xl bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const color = data.visual?.color ?? "rgb(34, 211, 238)";
  const dateLocale = locale === "en" ? "en-US" : "ko-KR";
  const appearance = resolveIdentityAppearance(
    {
      selfName: data.self_name,
      visual: data.visual,
      config: data.config ?? null,
      genLevel: data.gen_level,
      vitality: data.vitality,
    },
    locale
  );

  return (
    <div className="min-h-screen bg-black px-6 py-12 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_60%)]"
        aria-hidden="true"
      />
      <div className="max-w-md mx-auto">
        <article
          className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent p-6 shadow-[0_0_90px_rgba(34,211,238,0.08)]"
          style={{ borderColor: `${color}40` }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-70"
            style={{ background: `linear-gradient(180deg, ${color}18, transparent)` }}
          />
          <div className="relative mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                {locale === "en" ? "manifestation" : "manifestation"}
              </p>
              <p className="mt-1 text-sm font-medium text-white">{appearance.title}</p>
            </div>
            <IdentityPresence appearance={appearance} size="sm" />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{ background: `${color}22`, color }}
            >
              {data.gen_level}
            </div>
            <div className="relative">
              <h1 className="text-xl font-semibold">{data.self_name}</h1>
              <p className="text-sm text-white/50">
                Gen {data.gen_level} · {t("chat.vitality")} {Math.round((data.vitality ?? 1) * 100)}%
              </p>
              {appearance.usageNarrative && (
                <p className="mt-2 text-xs leading-5 text-white/58">{appearance.usageNarrative}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {appearance.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border px-2 py-1 text-[11px]"
                    style={{
                      borderColor: `${appearance.palette.primary}30`,
                      background: `${appearance.palette.primary}12`,
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-2xl font-semibold" style={{ color }}>{data.total_messages}</p>
              <p className="text-xs text-white/50">{t("sharePage.messages")}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-2xl font-semibold" style={{ color }}>{data.week_messages}</p>
              <p className="text-xs text-white/50">{t("sharePage.thisWeek")}</p>
            </div>
          </div>

          {data.milestones.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-white/50 mb-3">{t("sharePage.milestones")}</p>
              {data.milestones.slice(0, 5).map((m, i) => (
                <div
                  key={`${m.type}-${m.at}`}
                  className="flex gap-3 items-center rounded-xl bg-white/5 px-3 py-2"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0"
                    style={{ background: `${color}22`, color }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{m.label}</p>
                    <p className="text-white/45 text-xs">
                      {new Date(m.at).toLocaleDateString(dateLocale, { dateStyle: "medium" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10">
            <Link
              href="/"
              className="block w-full rounded-xl py-3 text-center text-sm font-medium transition-colors"
              style={{ background: `${color}20`, color }}
            >
              {t("sharePage.growWithGyeol")}
            </Link>
          </div>
        </article>

        <p className="mt-4 text-center text-white/40 text-xs">
          {t("sharePage.tagline")}
        </p>
      </div>
    </div>
  );
}
