"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, isValidLocale, type Locale } from "@/lib/i18n/config";
import { loadMessages, getNested } from "@/lib/i18n/messages";

type Messages = Record<string, Record<string, string>>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  ready: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_STORAGE_KEY = "gyeol_locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && isValidLocale(stored)) return stored;
  const nav = navigator.language?.slice(0, 2);
  if (nav && isValidLocale(nav)) return nav;
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const [messages, setMessages] = useState<Messages | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadMessages(locale).then((m) => {
      setMessages(m);
      setReady(true);
    });
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(LOCALE_STORAGE_KEY, l);
    loadMessages(l).then(setMessages);
  }, []);

  const t = useCallback(
    (key: string): string => {
      if (!messages) return key;
      const value = getNested(messages as Record<string, unknown>, key);
      return value ?? key;
    },
    [messages]
  );

  useEffect(() => {
    if (!ready) return;
    loadMessages(locale).then(setMessages);
  }, [locale, ready]);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    ready,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslations() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      t: (key: string) => key,
      locale: DEFAULT_LOCALE as Locale,
      setLocale: () => {},
      ready: false,
    };
  }
  return ctx;
}
