import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "결 GYEOL",
  description: "자율 진화하는 AI 생명체와 함께하는 일상",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width" as const,
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="bg-[var(--background)] text-[var(--foreground)] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
