import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "결 GYEOL — 자율 진화 AI 생명체",
  description: "당신만의 AI 생명체를 키우세요. 대화하고, 진화하고, 꿈을 꾸고, 세계와 연결되는 자율 진화 존재.",
  manifest: "/manifest.json",
  keywords: ["AI", "생명체", "결", "GYEOL", "자율", "진화", "채팅"],
  openGraph: {
    title: "결 GYEOL",
    description: "자율 진화 AI 생명체",
    type: "website",
  },
};

export const viewport = {
  width: "device-width" as const,
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-black text-white min-h-screen antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
