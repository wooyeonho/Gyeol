"use client";

import { useEffect } from "react";
import { useTranslations } from "@/components/i18n-provider";

export function DocumentLocaleSync() {
  const { locale } = useTranslations();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
