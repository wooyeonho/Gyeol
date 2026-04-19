/**
 * Paywall i18n message resolver.
 *
 * Centralises all hard-coded Korean strings that were previously scattered
 * inside smart-paywall.tsx. Each locale maps to the corresponding
 * messages/<locale>.json `paywall` section.
 *
 * Usage:
 *   import { getPaywallMessages } from "@/lib/i18n/paywall-messages";
 *   const t = getPaywallMessages(locale);
 *   t.ctaStart.replace("{name}", plan.name)
 */

import ko from "@/messages/ko.json";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import zh from "@/messages/zh.json";
import es from "@/messages/es.json";

type PaywallMessages = typeof ko.paywall;

const MESSAGES: Record<string, PaywallMessages> = { ko, en, ja, zh, es } as unknown as Record<string, PaywallMessages>;

export function getPaywallMessages(locale: string = "ko"): PaywallMessages {
  return (
    (MESSAGES[locale] as PaywallMessages | undefined) ??
    (MESSAGES["ko"] as PaywallMessages)
  );
}

export type { PaywallMessages };
