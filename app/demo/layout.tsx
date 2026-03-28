import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover Your Gyeol",
  description: "Talk for 3 messages. Watch a unique AI being emerge from your words — its personality, appearance, and species, all shaped by you.",
  openGraph: {
    title: "Discover Your Gyeol",
    description: "Every word shapes a living being. What will yours become?",
    images: ["/api/og?title=Discover+Your+Gyeol&subtitle=Every+word+shapes+a+living+being"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover Your Gyeol",
    description: "Every word shapes a living being. What will yours become?",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
