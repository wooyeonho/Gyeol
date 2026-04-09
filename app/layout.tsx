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
import { ReducedMotionProvider } from "@/components/reduced-motion-provider";
import { CookieConsent } from "@/components/cookie-consent";

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
  userScalable: true,
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const localeMetadata = METADATA_BY_LOCALE[locale] ?? DEFAULT_METADATA;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://gyeol.app";
  const ogTitle = typeof localeMetadata.title === "string" ? localeMetadata.title : "GYEOL";
  const ogDesc = typeof localeMetadata.description === "string" ? localeMetadata.description : "";

  return {
    ...localeMetadata,
    manifest: "/manifest.json",
    metadataBase: new URL(appUrl),
    keywords: [
      "AI companion", "AI creature", "virtual pet", "AI chat",
      "DNA evolution", "3D creature", "Tamagotchi AI",
      "AI \uB3D9\uBC18\uC790", "AI \uC0DD\uBA85\uCCB4", "AI \uCE5C\uAD6C",
      "gyeol", "\uACB0",
    ],
    openGraph: {
      type: "website",
      siteName: "GYEOL",
      title: ogTitle,
      description: ogDesc,
      url: appUrl,
      images: [
        {
          url: `${appUrl}/api/og?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(ogDesc)}`,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
      locale: locale === "ko" ? "ko_KR" : locale === "ja" ? "ja_JP" : locale === "zh" ? "zh_CN" : locale === "es" ? "es_ES" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
      images: [`${appUrl}/api/og?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(ogDesc)}`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large" as const,
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: appUrl,
      languages: {
        "ko": `${appUrl}?locale=ko`,
        "en": `${appUrl}?locale=en`,
        "ja": `${appUrl}?locale=ja`,
        "zh": `${appUrl}?locale=zh`,
        "es": `${appUrl}?locale=es`,
      },
    },
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
      <head>
        {/* Pretendard Variable: preloaded for performance (moved from CSS @import) */}
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          as="style"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ReducedMotionProvider>
        <I18nProvider initialLocale={locale}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:text-sm focus:font-medium focus:shadow-lg"
          >
            Skip to content
          </a>
          <DocumentLocaleSync />
          <ThemePreferenceSync />
          <WebPushManager />
          <CookieConsent />
          <NavigationHub />
          <AnalyticsProvider>
            <main id="main-content" role="main" aria-label="GYEOL">{children}</main>
          </AnalyticsProvider>
        </I18nProvider>
        </ReducedMotionProvider>
      </body>
    </html>
  );
}
