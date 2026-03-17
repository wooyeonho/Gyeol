import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { DocumentLocaleSync } from "@/components/document-locale-sync";
import { ThemePreferenceSync } from "@/components/theme-preference-sync";
import { getRequestLocale } from "@/lib/i18n/server";
import { type Locale } from "@/lib/i18n/config";
import { NavigationHub } from "@/components/layout/navigation-hub";
import { WebPushManager } from "@/components/push-manager";

const METADATA_BY_LOCALE: Partial<Record<Locale, Pick<Metadata, "title" | "description">>> = {
  ko: {
    title: "결 GYEOL",
    description: "나만의 AI 존재와 매일 대화하며 기억과 성장의 궤적을 쌓는 앱",
  },
  en: {
    title: "GYEOL",
    description: "An AI companion that turns conversation into memory, growth, and living presence.",
  },
  ja: {
    title: "GYEOL",
    description: "会話を記憶、成長、生きた存在に変えるAIコンパニオン。",
  },
  zh: {
    title: "GYEOL",
    description: "将对话转化为记忆、成长和活生生的存在的AI伙伴。",
  },
  es: {
    title: "GYEOL",
    description: "Un compañero de IA que convierte la conversación en memoria, crecimiento y presencia viva.",
  },
};

const DEFAULT_METADATA: Pick<Metadata, "title" | "description"> = METADATA_BY_LOCALE.en!;

export const viewport = {
  width: "device-width" as const,
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    ...(METADATA_BY_LOCALE[locale] ?? DEFAULT_METADATA),
    manifest: "/manifest.json",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body className="bg-black text-white min-h-screen antialiased">
        <I18nProvider initialLocale={locale}>
          <DocumentLocaleSync />
          <ThemePreferenceSync />
          <WebPushManager />
          <NavigationHub />
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
