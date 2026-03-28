import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ dna?: string; reading?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const hasDna = !!params.dna;
  const reading = params.reading;

  const title = hasDna ? "See what I got — Gyeol" : "Discover Your Gyeol";
  const description = reading
    ? `"${reading.slice(0, 150)}" — shaped by just 3 messages. What will yours become?`
    : "Talk for 3 messages. Watch a unique AI being emerge from your words.";

  const ogParams = new URLSearchParams();
  if (params.dna) ogParams.set("dna", params.dna);
  if (reading) ogParams.set("reading", reading.slice(0, 200));
  const ogImage = hasDna
    ? `/api/og/demo?${ogParams.toString()}`
    : "/api/og?title=Discover+Your+Gyeol&subtitle=Every+word+shapes+a+living+being";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
