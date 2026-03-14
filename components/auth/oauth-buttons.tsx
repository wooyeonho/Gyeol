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

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === "google") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.1 0-.7-.1-1.5-.2-2.2H12z" />
        <path fill="#34A853" d="M12 21c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-4H3.4v2.5A9.7 9.7 0 0 0 12 21z" />
        <path fill="#4A90E2" d="M6.6 13.1A5.8 5.8 0 0 1 6.3 12c0-.4.1-.8.2-1.1V8.4H3.4A9.7 9.7 0 0 0 2.3 12c0 1.5.4 2.9 1.1 4.1l3.2-2.5z" />
        <path fill="#FBBC05" d="M12 6.9c1.4 0 2.7.5 3.7 1.4l2.8-2.8A9.7 9.7 0 0 0 2.3 12h4.2c.7-2.3 2.9-5.1 5.5-5.1z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M12 .5C5.7.5.8 5.4.8 11.6c0 5 3.2 9.3 7.7 10.8.6.1.8-.2.8-.6v-2.1c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.7 1.2 3.3 1 .1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.2-5.1-5.4 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.5.1-3 0 0 .9-.3 3 .9a10 10 0 0 1 5.4 0c2.1-1.2 3-.9 3-.9.6 1.5.2 2.7.1 3 .7.8 1.1 1.7 1.1 2.9 0 4.2-2.6 5.1-5.1 5.4.4.3.8 1 .8 2v3c0 .4.2.7.8.6a11 11 0 0 0 7.7-10.8C23.2 5.4 18.3.5 12 .5z" />
    </svg>
  );
}

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
          <span className="bg-[#0b0b0b] px-3 text-xs uppercase tracking-[0.2em] text-white/60">
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
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            <ProviderIcon provider={provider} />
            {t(`auth.oauth.${provider}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
