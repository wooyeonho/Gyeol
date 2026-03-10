"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/components/i18n-provider";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { locale, ready } = useTranslations();
  const lastTrackedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !pathname) return;
    const routeKey = `${locale}:${pathname}`;
    if (lastTrackedKey.current === routeKey) return;
    lastTrackedKey.current = routeKey;
    trackClientEvent(
      CLIENT_EVENT.pageView,
      { source: "route_change" },
      { locale, path: pathname }
    );
  }, [locale, pathname, ready]);

  return <>{children}</>;
}
