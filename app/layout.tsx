import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { DocumentLocaleSync } from "@/components/document-locale-sync";

export const metadata: Metadata = {
  title: "결 GYEOL",
  description: "나만의 AI 존재와 매일 대화하며 기억과 성장의 궤적을 쌓는 앱",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width" as const,
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-black text-white min-h-screen antialiased">
        <I18nProvider>
          <DocumentLocaleSync />
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
