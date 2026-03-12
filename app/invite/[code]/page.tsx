"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "@/components/i18n-provider";

export default function InviteLandingPage() {
  const { t } = useTranslations();
  const params = useParams();
  const code = params?.code as string | undefined;
  const [valid, setValid] = useState<boolean | null>(() => (code ? null : false));

  useEffect(() => {
    if (!code) return;
    fetch(`/api/invite/${code}`)
      .then((r) => r.ok)
      .then(setValid)
      .catch(() => setValid(false));
  }, [code]);

  if (valid === null) {
    return (
      <div className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/10" />
          <div className="mt-6 h-11 w-36 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.08)]">
          <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/55">
            {t("invitePage.invalidEyebrow")}
          </div>
          <p className="mt-4 text-white/68">{t("invitePage.invalid")}</p>
          <Link
            href="/invite"
            className="mt-5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15"
          >
            {t("invitePage.openHelp")}
          </Link>
          <Link href="/" className="mt-3 text-sm text-white/55 hover:text-white/80">
            {t("invitePage.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_0_90px_rgba(34,211,238,0.08)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">{t("invitePage.eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("invitePage.title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/68 sm:text-base">
          {t("invitePage.subtitle")}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-left">
            <p className="text-xs uppercase tracking-wider text-white/45">
              {t("invitePage.nextTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              {t("invitePage.nextBody")}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.08] p-4 text-left">
            <p className="text-xs uppercase tracking-wider text-cyan-100/75">
              {t("invitePage.bestFirstStepTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/82">
              {t("invitePage.bestFirstStepBody")}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/signup?ref=${code}`}
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90"
          >
            {t("invitePage.start")}
          </Link>
          <Link href="/login" className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-white/85 hover:bg-white/10">
            {t("invitePage.haveAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
