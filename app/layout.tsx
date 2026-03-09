import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "결 GYEOL",
  description: "Autonomous evolving AI lifeform",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width" as const,
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-black text-white antialiased selection:bg-white/20 selection:text-white">
        <a href="#main-content" className="skip-link">
          본문으로 건너뛰기
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
