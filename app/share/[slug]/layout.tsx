import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { getRequestLocale } from "@/lib/i18n/server";
import { buildShareCardMetadata, loadShareCardData } from "@/lib/share/card";

type ShareLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ShareLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const data = await loadShareCardData(createServiceClient(), slug, locale);
  const { title, description } = buildShareCardMetadata(data, locale);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ShareLayout({ children }: ShareLayoutProps) {
  return children;
}
