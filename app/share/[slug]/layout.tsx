import type { Metadata } from "next";

type ShareLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

async function loadShareData(slug: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!appUrl) return null;
  try {
    const res = await fetch(`${appUrl}/api/share/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ShareLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadShareData(slug);
  const title = data?.self_name ? `${data.self_name}의 성장 카드` : "결의 공유 카드";
  const description = data?.week_messages != null
    ? `이번 주 ${data.week_messages}개의 대화가 쌓인 결의 성장 카드입니다.`
    : "결의 성장 카드와 마일스톤을 확인해보세요.";
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
