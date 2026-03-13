import Link from "next/link";
import type { Metadata } from "next";
import { getTermsOfService } from "@/lib/legal/copy";
import { getRequestLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const doc = getTermsOfService(locale);
  return {
    title: doc.title,
    description: doc.subtitle,
  };
}

export default async function TermsPage() {
  const locale = await getRequestLocale();
  const doc = getTermsOfService(locale);

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:py-16">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_90px_rgba(34,211,238,0.04)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">LEGAL</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
          <p className="mt-4 text-sm leading-6 text-white/70 sm:text-base">{doc.subtitle}</p>
          <p className="mt-4 text-xs text-white/45">
            {doc.updatedAtLabel}: {doc.updatedAtValue}
          </p>
        </header>

        <div className="mt-6 space-y-4">
          {doc.sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-white/72">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            {locale === "ko" ? "홈으로 돌아가기" : "Back to home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
