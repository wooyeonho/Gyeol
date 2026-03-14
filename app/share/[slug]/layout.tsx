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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const ogImageUrl = baseUrl ? `${baseUrl}/api/share/${slug}/og` : `/api/share/${slug}/og`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ShareLayout({ children }: ShareLayoutProps) {
  return children;
}
