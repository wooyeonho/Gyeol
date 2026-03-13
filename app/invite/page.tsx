"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

export default function InviteHubPage() {
  const { t } = useTranslations();

  return (
    <div className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_90px_rgba(56,189,248,0.08)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
            {t("inviteHubPage.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("invitePage.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
            {t("inviteHubPage.subtitle")}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-wider text-white/45">
                {t("inviteHubPage.alreadyInvitedTitle")}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/80">
                {t("inviteHubPage.alreadyInvitedBody")}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.08] p-4">
              <p className="text-xs uppercase tracking-wider text-cyan-100/75">
                {t("inviteHubPage.inviteOthersTitle")}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/82">
                {t("inviteHubPage.inviteOthersBody")}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90"
            >
              {t("inviteHubPage.createAccount")}
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm text-white/85 hover:bg-white/10"
            >
              {t("invitePage.haveAccount")}
            </Link>
            <Link
              href="/community"
              className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm text-white/85 hover:bg-white/10"
            >
              {t("inviteHubPage.backCommunity")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
