import { LegalFooter } from "@/components/legal-footer";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      {children}
      <LegalFooter />
    </div>
  );
}
