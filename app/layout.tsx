import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "결 GYEOL — 자율 진화 AI 생명체",
  description: "당신만의 AI 생명체가 스스로 진화하고, 꿈꾸고, 창작합니다. 세계를 탐험하고 다른 생명체와 만나보세요.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "결 GYEOL — 자율 진화 AI 생명체",
    description: "당신만의 AI 생명체가 스스로 진화하고, 꿈꾸고, 창작합니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "결 GYEOL",
  },
  twitter: {
    card: "summary_large_image",
    title: "결 GYEOL — 자율 진화 AI 생명체",
    description: "당신만의 AI 생명체가 스스로 진화하고, 꿈꾸고, 창작합니다.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "결",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-black text-white min-h-dvh antialiased selection:bg-accent/30">
        {children}
      </body>
    </html>
  );
}
