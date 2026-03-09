import type { Metadata } from "next";
import "./globals.css";
import { AutonomousEvolutionLoop } from "@/components/autonomous-evolution-loop";

export const metadata: Metadata = {
  title: "결 GYEOL",
  description: "관계와 약속을 운영하고, 그 흐름을 이야기로 보여주는 AI Relationship OS",
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
        <AutonomousEvolutionLoop />
        {children}
      </body>
    </html>
  );
}
