"use client";

import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/components/i18n-provider";
import { trackClientEvent } from "@/lib/analytics/client";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";

type OAuthButtonsProps = {
  flow: "login" | "signup";
  loading?: boolean;
  nextPath?: string;
  refCode?: string | null;
  onError?: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
};

type Provider = "google" | "github";

const PROVIDERS: Provider[] = ["google", "github"];

function buildRedirectUrl(provider: Provider, flow: "login" | "signup", nextPath: string, refCode?: string | null) {
  const origin = window.location.origin;
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);
  callbackUrl.searchParams.set("provider", provider);
  callbackUrl.searchParams.set("flow", flow);
  if (refCode) callbackUrl.searchParams.set("ref", refCode);
  return callbackUrl.toString();
}

export function OAuthButtons({
  flow,
  loading = false,
  nextPath = "/",
  refCode,
  onError,
  onLoadingChange,
}: OAuthButtonsProps) {
  const supabase = createClient();
  const { t } = useTranslations();

  async function handleOAuth(provider: Provider) {
    onError?.("");
    onLoadingChange?.(true);
    trackClientEvent(flow === "login" ? CLIENT_EVENT.loginStarted : CLIENT_EVENT.signupStarted, {
      method: provider,
      ref: refCode ?? undefined,
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildRedirectUrl(provider, flow, nextPath, refCode),
      },
    });

    if (error) {
      trackClientEvent(CLIENT_EVENT.authFailed, { method: provider, stage: flow });
      onError?.(error.message);
      onLoadingChange?.(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#0b0b0b] px-3 text-xs uppercase tracking-[0.2em] text-white/45">
            {t("auth.oauthDivider")}
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => void handleOAuth(provider)}
            disabled={loading}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            {t(`auth.oauth.${provider}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
