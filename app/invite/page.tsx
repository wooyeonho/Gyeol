"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

export default function InviteHubPage() {
  const { locale, t } = useTranslations();

  return (
    <div className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_90px_rgba(56,189,248,0.08)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
            {locale === "en" ? "invite access" : "invite access"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("invitePage.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
            {locale === "en"
              ? "If you already have an invite code, open the exact invite link you received. If not, start your account first and create your own referral link from Settings after onboarding."
              : "이미 초대 코드를 받았다면 전달받은 정확한 초대 링크로 들어오세요. 아직 코드가 없다면 먼저 계정을 만들고, 온보딩 후 설정에서 나만의 초대 링크를 발급할 수 있습니다."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-wider text-white/45">
                {locale === "en" ? "already invited" : "초대를 이미 받았다면"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/80">
                {locale === "en"
                  ? "Use the invite URL from the sender to unlock signup with the referral attached automatically."
                  : "보낸 사람이 전달한 초대 URL로 들어오면 추천 정보가 자동으로 연결된 상태로 가입을 시작할 수 있습니다."}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.08] p-4">
              <p className="text-xs uppercase tracking-wider text-cyan-100/75">
                {locale === "en" ? "want to invite others later?" : "나중에 직접 초대하고 싶다면"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/82">
                {locale === "en"
                  ? "Create your account first. After your first conversations, your invite link appears in Settings."
                  : "먼저 계정을 만들고 결과 첫 대화를 시작하세요. 이후 설정 화면에서 나만의 초대 링크를 바로 만들 수 있습니다."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90"
            >
              {locale === "en" ? "Create account" : "계정 만들기"}
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
              {locale === "en" ? "Back to community" : "커뮤니티로 돌아가기"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
